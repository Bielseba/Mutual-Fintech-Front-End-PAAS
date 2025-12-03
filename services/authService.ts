
import {
  LoginDTO,
  RegisterDTO,
  AuthResponse,
  User,
  normalizeUser,
  Transaction,
  UserFees,
} from "../types";

// API URL Funcional (Backend Real)
const API_URL = "https://mutual-fintech-user-service.vercel.app/api";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000
): Promise<Response> {
  try {
    return await fetch(url, { ...options, referrerPolicy: "no-referrer" });
  } catch (error: any) {
    if (
      retries > 0 &&
      (error.message === "Failed to fetch" || error.name === "TypeError")
    ) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

// Helper: Smart Route Discovery (Try multiple paths)
async function requestWithRouteDiscovery(
  basePath: string,
  options: RequestInit
): Promise<Response> {
  const candidates = [
    `${API_URL}/auth/${basePath}`, // /api/auth/login
    `${API_URL}/${basePath}`, // /api/login
  ];

  let lastError: any;

  for (const url of candidates) {
    try {
      const response = await fetchWithRetry(url, options, 0);
      if (response.status !== 404) {
        return response;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Não foi possível conectar ao servidor de autenticação (404).");
}

export const authService = {
  // Helper internal para buscar credenciais salvas
  _getStoredCredentials() {
    let appId = localStorage.getItem("app_id");
    let appSecret = localStorage.getItem("app_secret");

    if (!appId || !appSecret) {
        const userStr = localStorage.getItem("mutual_user");
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                appId = appId || u.appId || u.app_id;
                appSecret = appSecret || u.clientSecret || u.app_secret_hash || u.client_secret;
                
                // Persist found credentials
                if (appId) localStorage.setItem("app_id", String(appId));
                if (appSecret) localStorage.setItem("app_secret", String(appSecret));
            } catch(e) {}
        }
    }
    return { appId, appSecret };
  },

  // Headers básicos para leitura (GET)
  getBasicHeaders() {
    const token = localStorage.getItem("mutual_token");
    if (!token) throw new Error("Usuário não autenticado.");
    
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    const { appId, appSecret } = this._getStoredCredentials();

    // Adiciona credenciais apenas se forem válidas
    if (appId) headers["app_id"] = String(appId);
    if (appSecret) headers["client_id"] = String(appSecret);

    return headers;
  },

  // Headers completos para o Gateway (POST Pix)
  getGatewayHeaders() {
    return this.getBasicHeaders(); // Reuses the same logic as basic now includes app_id
  },

  // --- NEW: System Status Check ---
  async getSystemStatus(): Promise<{ maintenance: boolean; message?: string }> {
      try {
          // Check public maintenance endpoint
          const response = await fetch(`${API_URL}/public/maintenance`, {
             method: 'GET',
             headers: { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
              const json = await response.json();
              // Structure: { ok: true, data: { isActive: true, message: "..." } }
              if (json.data && json.data.isActive) {
                  return { 
                      maintenance: true, 
                      message: json.data.message || "O sistema está em manutenção programada." 
                  };
              }
          } else if (response.status === 503) {
              // Fallback for standard 503
              return { maintenance: true, message: "Serviço temporariamente indisponível." };
          }
          
          return { maintenance: false };
      } catch (error) {
          console.error("Error checking maintenance status:", error);
          // In case of network error, usually we allow the app to try loading, 
          // unless it's a persistent connection issue which will be caught by other calls.
          return { maintenance: false };
      }
  },

  async login(credentials: LoginDTO): Promise<AuthResponse> {
    const options: RequestInit = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
    };

    const response = await requestWithRouteDiscovery("login", options);
    
    // Check for maintenance on login
    if (response.status === 503) {
        throw new Error("MAINTENANCE_MODE");
    }

    const contentType = response.headers.get("content-type");
    let data: any;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error("Login response not JSON:", text);
      throw new Error(
        `Erro de conexão com API (${response.status}). Endpoint não encontrado.`
      );
    }

    if (!response.ok) {
      if (data?.meta?.code === "USER_PENDING_APPROVAL") {
        throw new Error(
          "Cadastro em análise: Seu acesso ainda não foi aprovado pelo administrador."
        );
      }
      const errorMessage = data.message || data.error || "Erro ao realizar login";
      throw new Error(
        Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage
      );
    }

    if (!data || !data.user) {
      throw new Error("Resposta inválida da API de login.");
    }

    const rawUser = data.user;
    let normalizedUser: User = normalizeUser(rawUser);

    const token = data.token || data.access_token || data.accessToken || "";
    const appId = data.appId || data.app_id || rawUser.appId || rawUser.app_id;
    const clientSecret = data.clientSecret || data.client_secret || rawUser.clientSecret || rawUser.client_secret;

    if (token) localStorage.setItem("mutual_token", token);
    if (appId) localStorage.setItem("app_id", String(appId));
    if (clientSecret) localStorage.setItem("app_secret", String(clientSecret));

    localStorage.setItem("mutual_user", JSON.stringify(normalizedUser));

    return {
      token,
      access_token: token,
      user: normalizedUser,
    };
  },

  async register(data: RegisterDTO): Promise<any> {
    const payload: any = {
      name: data.name,
      email: data.email,
      password: data.password,
      personType: data.personType,
    };

    if (data.personType === "PF") {
      if (!data.document)
        throw new Error("CPF é obrigatório para Pessoa Física.");
      payload.document = data.document.replace(/\D/g, "");
    } else {
      if (!data.cnpj) throw new Error("CNPJ é obrigatório para Pessoa Jurídica.");
      if (!data.companyName)
        throw new Error("Razão Social é obrigatória.");
      payload.cnpj = data.cnpj.replace(/\D/g, "");
      payload.companyName = data.companyName;
      payload.tradeName = data.tradeName || null;
      payload.partnerName = data.partnerName || data.name;
    }

    const options: RequestInit = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    };

    const response = await requestWithRouteDiscovery("register", options);
    
    if (response.status === 503) throw new Error("MAINTENANCE_MODE");

    let responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Erro ao realizar cadastro");
    }

    return responseData;
  },

  async getCredentials(userId: string | number): Promise<{ appId: string; clientSecret: string } | null> {
    const token = this.getToken();
    if (!token) throw new Error("Sessão expirada.");

    const { appId, appSecret } = this._getStoredCredentials();
    if (appId && appSecret) {
        return { appId, clientSecret: appSecret };
    }

    const url = `${API_URL}/users/${userId}/credentials`;
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) return null;
    const json = await response.json();
    if (json.data) {
        return { 
            appId: json.data.app_id || json.data.appId, 
            clientSecret: json.data.client_secret || json.data.clientSecret 
        };
    }
    return null;
  },

  async rotateCredentials(userId: string | number): Promise<any> {
     return this.getCredentials(userId); 
  },

  async getWalletBalance(userId: string | number): Promise<number> {
     try {
         const headers = this.getBasicHeaders();
         const response = await fetch(`${API_URL}/users/${userId}/wallet`, {
             method: "GET",
             headers: headers as any
         });
         if (!response.ok) throw new Error("Falha ao buscar saldo");
         const json = await response.json();
         return parseFloat(json.balance || json.data?.balance || 0);
     } catch (e) {
         console.error("Erro getWalletBalance:", e);
         return 0;
     }
  },

  async getWalletLedger(): Promise<Transaction[]> {
    try {
        const user = this.getUser();
        if (!user?.id) return [];

        const headers = this.getBasicHeaders();
        // Use user-specific endpoint to align with balance request
        const response = await fetch(`${API_URL}/users/${user.id}/wallet/ledger`, {
            method: "GET",
            headers: headers as any
        });
        
        if (!response.ok) {
            // Fallback to /me if /users/id fails, though usually /users/id is safer if we have ID
            const fallbackResponse = await fetch(`${API_URL}/me/wallet/ledger`, {
                method: "GET",
                headers: headers as any
            });
            if (fallbackResponse.ok) {
                const json = await fallbackResponse.json();
                const list = json.ledger || json.data || [];
                return this._mapLedger(list);
            }
            throw new Error("Falha ao buscar extrato");
        }
        
        const json = await response.json();
        const list = json.ledger || json.data || [];
        return this._mapLedger(list);
    } catch (e) {
        console.error("Erro getWalletLedger:", e);
        return [];
    }
  },

  _mapLedger(list: any[]): Transaction[] {
      return list.map((tx: any) => ({
        id: tx.id || tx._id || 'TX-UNK',
        amount: Number(tx.amount || tx.value || 0),
        date: tx.created_at || new Date().toISOString(),
        description: tx.description || 'Transação',
        type: (tx.amount > 0 || tx.type === 'CREDIT') ? 'CREDIT' : 'DEBIT',
        status: tx.status || 'COMPLETED',
        sender: tx.sender,
        recipient: tx.recipient
    }));
  },

  // PIX IN (Depósito) - Função Ajustada com userId, client_id e client_secret
  async createPixCharge(amount: number): Promise<{
    qrCode: string;
    qrCodeImage: string;
    orderId: string;
    expiresAt: string;
  }> {
    
    // 1. Validar Usuário
    const user = this.getUser();
    if (!user || !user.id) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }
    const userId = Number(user.id);

    // 2. Montar URL com userId na query (para garantir)
    const url = `${API_URL}/wallet/deposit/pix?userId=${userId}`;
    
    // 3. Montar Headers Obrigatórios
    const headers = this.getGatewayHeaders();
    
    if (!headers['app_id']) {
        throw new Error("Credenciais de API (App ID) não encontradas. Por favor, faça logout e login novamente.");
    }

    // Injetar headers adicionais esperados (client_id, client_secret)
    if (headers['app_id']) headers['client_id'] = headers['app_id'];
    if (headers['app_secret']) headers['client_secret'] = headers['app_secret'];

    // 4. Montar Body com userId
    const payload = {
      amount: Number(amount),
      currency: "BRL",
      payMethod: "PIX",
      userId: userId // Campo obrigatório
    };

    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      referrerPolicy: "no-referrer",
      headers: headers as any,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Erro API Pix:", errText);
        throw new Error("Falha ao gerar Pix: " + (errText || response.statusText));
    }

    const json = await response.json();
    
    const qrCode = json.qrCodeText || json.qrCode || json.data?.qrCode || json.emvqrcps;
    const qrCodeImage = json.qrCodeImage || json.qrCodeBase64 || json.data?.qrCodeImage;
    const orderId = json.orderNo || json.id || json.data?.orderNo || "N/A";

    if (!qrCode && !qrCodeImage) {
        throw new Error("QR Code não retornado pela API.");
    }

    return {
        qrCode,
        qrCodeImage,
        orderId,
        expiresAt: json.expiresAt || ""
    };
  },

  async createPixWithdraw(amount: number, pixKey: string, keyType: string): Promise<any> {
      const headers = this.getGatewayHeaders();
      const payload = {
          amount,
          key: pixKey,
          keyType,
          payMethod: "PIX"
      };
      
      const response = await fetch(`${API_URL}/wallet/withdraw/pix`, {
          method: "POST",
          headers: headers as any,
          body: JSON.stringify(payload)
      });
      
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Erro no saque");
      
      return {
          ok: true,
          status: 'PENDING',
          orderId: json.orderNo || 'WD-' + Date.now(),
          amount
      };
  },

  async createPaymentLink(linkData: any) {
      return this.createPixCharge(linkData.value).then(pix => ({
          ...linkData,
          qrCode: pix.qrCode,
          qrCodeImage: pix.qrCodeImage
      }));
  },

  async getMyFees(): Promise<UserFees | null> {
      try {
          const headers = this.getBasicHeaders();
          const res = await fetch(`${API_URL}/me/fees`, { headers: headers as any });
          const json = await res.json();
          return json.data ? { 
              userId: json.data.userId, 
              pixInPercent: Number(json.data.pixInPercent), 
              pixOutPercent: Number(json.data.pixOutPercent) 
          } : null;
      } catch { return null; }
  },

  logout() {
    localStorage.removeItem("mutual_token");
    localStorage.removeItem("mutual_user");
    localStorage.removeItem("app_id");
    localStorage.removeItem("app_secret");
  },

  getToken() {
    return localStorage.getItem("mutual_token");
  },

  getUser(): User | null {
    const userStr = localStorage.getItem("mutual_user");
    if (!userStr) return null;
    try {
      return normalizeUser(JSON.parse(userStr));
    } catch {
      return null;
    }
  },
};
