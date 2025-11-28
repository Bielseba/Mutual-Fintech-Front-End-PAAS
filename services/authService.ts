
import {
  LoginDTO,
  RegisterDTO,
  AuthResponse,
  User,
  normalizeUser,
  Transaction,
  UserFees,
} from "../types";

// BACK DO USER-SERVICE PUBLICA TUDO DEBAIXO DE /api
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
    `https://mutual-fintech-user-service.vercel.app/auth/${basePath}`,
    `https://mutual-fintech-user-service.vercel.app/${basePath}`,
    `https://mutual-fintech-user-service.vercel.app/login`, // Fallback extreme
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
  // --- FUNÇÃO UTILITÁRIA REQUISITADA ---
  getGatewayHeaders() {
    const token = localStorage.getItem("mutual_token");
    let appId = localStorage.getItem("app_id");
    let appSecret = localStorage.getItem("app_secret");

    // Fallback: se não achar nas chaves diretas, tenta extrair do objeto de usuário salvo (sessão antiga)
    if (!appId || !appSecret) {
        const userStr = localStorage.getItem("mutual_user");
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                if (!appId) appId = u.appId || u.app_id;
                if (!appSecret) appSecret = u.clientSecret || u.app_secret_hash || u.client_secret;
                
                // Salva para a próxima vez ser mais rápido
                if (appId) localStorage.setItem("app_id", appId);
                if (appSecret) localStorage.setItem("app_secret", appSecret);
            } catch(e) {}
        }
    }

    if (!token) throw new Error("Usuário não autenticado.");

    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "app_id": appId || "",
      "app_secret": appSecret || ""
    };
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

    // Salvar credenciais retornadas pelo Login conforme solicitado
    const token = data.token || data.access_token || data.accessToken || "";
    // Prioriza dados da raiz da resposta, depois do objeto user
    const appId = data.appId || data.app_id || rawUser.appId || rawUser.app_id;
    const clientSecret = data.clientSecret || data.client_secret || rawUser.clientSecret || rawUser.client_secret;

    if (token) localStorage.setItem("mutual_token", token);
    if (appId) localStorage.setItem("app_id", String(appId));
    if (clientSecret) localStorage.setItem("app_secret", String(clientSecret));

    // Persistência do User
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
    let responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || "Erro ao realizar cadastro");
    }

    return responseData;
  },

  async getCredentials(userId: string | number): Promise<{ appId: string; clientSecret: string } | null> {
    const token = this.getToken();
    if (!token) throw new Error("Sessão expirada.");

    // Se já temos no localStorage, retornamos direto para evitar request extra
    const storedAppId = localStorage.getItem("app_id");
    const storedSecret = localStorage.getItem("app_secret");
    if (storedAppId && storedSecret) {
        return { appId: storedAppId, clientSecret: storedSecret };
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
     // Implementação simplificada mantendo contrato
     return this.getCredentials(userId); 
  },

  async getWalletBalance(userId: string | number): Promise<number> {
     try {
         // Agora usa os headers corretos com app_id
         const headers = this.getGatewayHeaders();
         const response = await fetch(`${API_URL}/users/${userId}/wallet`, {
             method: "GET",
             headers: headers
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
        // Agora usa os headers corretos com app_id
        const headers = this.getGatewayHeaders();
        const response = await fetch(`${API_URL}/me/wallet/ledger`, {
            method: "GET",
            headers: headers
        });
        if (!response.ok) throw new Error("Falha ao buscar extrato");
        
        const json = await response.json();
        const list = json.ledger || json.data || [];
        
        return list.map((tx: any) => ({
            id: tx.id || tx._id || 'TX-UNK',
            amount: Number(tx.amount || tx.value || 0),
            date: tx.created_at || new Date().toISOString(),
            description: tx.description || 'Transação',
            type: (tx.amount > 0 || tx.type === 'CREDIT') ? 'CREDIT' : 'DEBIT',
            status: tx.status || 'COMPLETED'
        }));
    } catch (e) {
        console.error("Erro getWalletLedger:", e);
        return [];
    }
  },

  // --- FUNÇÃO AJUSTADA PARA PIX IN (DEPÓSITO) ---
  async createPixCharge(amount: number): Promise<{
    qrCode: string;
    qrCodeImage: string;
    orderId: string;
    expiresAt: string;
  }> {
    const url = `${API_URL}/wallet/deposit/pix`;

    // 1. Monta os headers usando a função utilitária que pega do localStorage
    const headers = this.getGatewayHeaders();

    // 2. Payload limpo conforme requisitado
    const payload = {
      amount: Number(amount),
      currency: "BRL",
      payMethod: "PIX"
    };

    console.log("[AuthService] Criando Pix In:", url, payload);

    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: headers, // Headers injetados corretamente
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Erro API Pix:", errText);
        throw new Error("Falha ao gerar Pix: " + errText);
    }

    const json = await response.json();
    
    // Extração robusta dos dados do Pix
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
          headers: headers,
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
          const headers = this.getGatewayHeaders();
          const res = await fetch(`${API_URL}/me/fees`, { headers });
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
