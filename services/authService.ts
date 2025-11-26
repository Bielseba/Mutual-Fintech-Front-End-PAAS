
import {
  LoginDTO,
  RegisterDTO,
  AuthResponse,
  User,
  normalizeUser,
  Transaction,
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
      console.log("[AuthService] Login response JSON:", data);
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

    const rawStatus = rawUser.status ?? data.status ?? null;
    const status = rawStatus ? String(rawStatus).toUpperCase().trim() : null;

    if (status === "PENDING") {
      throw new Error("Cadastro em análise: Aguarde a aprovação do administrador.");
    }

    const rawDocStatus =
      rawUser.doc_status ?? rawUser.docStatus ?? data.doc_status ?? null;
    if (rawDocStatus) {
      const docStatus = String(rawDocStatus).toUpperCase().trim();
      if (docStatus !== "APPROVED") {
        throw new Error("Cadastro em análise: Aguarde a aprovação do administrador.");
      }
    }

    // 🔥 NORMALIZA O USER E GARANTE QUE O ID FICA BEM DEFINIDO
    let normalizedUser: User = normalizeUser(rawUser);

    // Força o id a vir de algum campo numérico (id, userId, _id)
    const candidateId =
      rawUser.id ??
      rawUser.userId ??
      rawUser.user_id ??
      rawUser._id ??
      normalizedUser.id;

    if (!candidateId) {
      console.error("[AuthService] Nenhum ID encontrado no user:", rawUser);
      throw new Error("ID do usuário não retornado pela API.");
    }

    normalizedUser = {
      ...normalizedUser,
      id: String(candidateId),
    };

    // 🔐 TOKEN
    const token: string =
      data.token || data.access_token || data.accessToken || "";

    if (token) {
      localStorage.setItem("mutual_token", token);
    }

    // Salva o usuário normalizado com id garantido
    localStorage.setItem("mutual_user", JSON.stringify(normalizedUser));

    console.log("[AuthService] Login OK. userId =", normalizedUser.id);

    return {
      token,
      access_token: token,
      user: normalizedUser,
    };
  },

  async register(data: RegisterDTO): Promise<any> {
    const personType = (data.personType || "PF").toUpperCase()

    const payload: any = {
      name: data.name,
      email: data.email,
      password: data.password,
      personType,
    }

    if (personType === "PF") {
      if (!data.document) {
        throw new Error("CPF é obrigatório para Pessoa Física.")
      }
      payload.document = data.document.replace(/\D/g, "")
    } else {
      if (!data.cnpj) {
        throw new Error("CNPJ é obrigatório para Pessoa Jurídica.")
      }
      if (!data.companyName) {
        throw new Error("Razão Social é obrigatória.")
      }

      payload.cnpj = data.cnpj.replace(/\D/g, "")
      payload.companyName = data.companyName
      payload.tradeName = data.tradeName || null
      payload.partnerName =
        data.partnerName ||
        data.tradeName ||
        data.companyName ||
        data.name ||
        "Responsável"
    }

    const options: RequestInit = {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }

    const response = await requestWithRouteDiscovery("register", options)

    let responseData
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json()
    } else {
      throw new Error(`Erro na API de registro (${response.status}).`)
    }

    if (!response.ok) {
      const errorMessage =
        responseData.message ||
        responseData.error ||
        "Erro ao realizar cadastro"
      throw new Error(
        Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage
      )
    }

    return responseData
  },

  async getCredentials(
    userId: string | number
  ): Promise<{ appId: string; clientSecret: string } | null> {
    const token = this.getToken();
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");
    if (!userId) throw new Error("ID do usuário não encontrado.");

    const url = `${API_URL}/users/${userId}/credentials`;

    const response = await fetchWithRetry(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Erro ao buscar credenciais (${response.status}).`);
    }

    const json = await response.json();

    if (json.ok && json.data) {
      const d = json.data;
      const appId = d.app_id || d.appId || d.client_id;
      const clientSecret = d.client_secret || d.clientSecret || d.secret;

      if (appId && clientSecret) {
        return { appId: String(appId), clientSecret: String(clientSecret) };
      }

      if (Object.keys(d).length === 0) {
        return null;
      }
    }

    return null;
  },

  async rotateCredentials(
    userId: string | number
  ): Promise<{ appId: string; clientSecret: string }> {
    const token = this.getToken();
    if (!token) throw new Error("Sessão expirada.");

    const url = `${API_URL}/users/${userId}/credentials/rotate`;

    const response = await fetchWithRetry(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    const json = await response.json();

    if (!response.ok || json.ok === false) {
      throw new Error(json.message || "Erro ao rotacionar credenciais.");
    }

    if (json.data) {
      const d = json.data;
      const appId = d.app_id || d.appId || d.client_id;
      const clientSecret = d.client_secret || d.clientSecret || d.secret;

      if (appId && clientSecret) {
        return { appId: String(appId), clientSecret: String(clientSecret) };
      }
    }

    throw new Error("Não foi possível processar as novas credenciais.");
  },

  async getWalletBalance(userId: string | number): Promise<number> {
    const token = this.getToken();
    if (!token) throw new Error("Sessão expirada.");

    const url = `${API_URL}/users/${userId}/wallet`;

    try {
      const response = await fetchWithRetry(url, {
        method: "GET",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return 0;
      }

      const json = await response.json();
      console.log("[AuthService] Balance raw response:", JSON.stringify(json));

      let balance: any = undefined;
      if (json.balance !== undefined) {
        balance = json.balance;
      } else if (json.data && json.data.balance !== undefined) {
        balance = json.data.balance;
      }

      if (balance !== undefined && balance !== null) {
        const parsed = parseFloat(String(balance));
        return isNaN(parsed) ? 0 : parsed;
      }

      return 0;
    } catch (_err) {
      return 0;
    }
  },

  async getWalletLedger(userId: string | number): Promise<Transaction[]> {
    const token = this.getToken();
    if (!token) throw new Error("Sessão expirada.");

    const url = `${API_URL}/users/${userId}/wallet/ledger`;
    
    try {
        const response = await fetchWithRetry(url, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
             throw new Error("Erro ao buscar extrato");
        }

        const json = await response.json();
        const rawTransactions = json.data || json.transactions || json.ledger || [];
        
        // Map backend fields to frontend Transaction interface
        return rawTransactions.map((tx: any) => ({
            id: tx.id || tx._id || tx.transactionId,
            amount: Number(tx.amount || 0),
            date: tx.created_at || tx.date || tx.createdAt || new Date().toISOString(),
            description: tx.description || (tx.type === 'CREDIT' ? 'Depósito Pix' : 'Saque Pix'),
            status: tx.status || 'COMPLETED',
            type: tx.type || (Number(tx.amount) > 0 ? 'CREDIT' : 'DEBIT'),
            customerName: tx.description || 'Transação', // Fallback
            pixKey: tx.pixKey || tx.sender || tx.recipient || '-'
        }));

    } catch (err) {
        console.error("Failed to fetch ledger:", err);
        return [];
    }
  },

  async createPixCharge(amount: number): Promise<{
    qrCode: string;
    qrCodeImage: string;
    orderId: string;
    expiresAt: string;
  }> {
    const token = this.getToken();
    const user = this.getUser();

    if (!token) throw new Error("Sessão expirada. Faça login novamente.");
    if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

    // ⚙️ EXTRAI O ID DO USER DE FORMA CONFIÁVEL
    const rawUserId: any =
      (user as any).id ??
      (user as any).userId ??
      (user as any).user_id ??
      (user as any)._id;

    if (!rawUserId) {
      console.error("User object missing ID:", user);
      throw new Error("ID do usuário não encontrado na sessão. Tente relogar.");
    }

    // 🔢 CONVERTE PARA NÚMERO (GATEWAY ESPERA INTEGER)
    const numericId = parseInt(String(rawUserId), 10);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      console.error("User ID inválido para operação financeira:", rawUserId);
      throw new Error("ID do usuário inválido para operação financeira.");
    }

    const userIdToSend: number = numericId;

    // 📄 DADOS DO PAGADOR
    const rawCPF = (user.document || (user as any).cpf || (user as any).cnpj || "").replace(/\D/g, "");
    const payerCPF = rawCPF.length >= 11 ? rawCPF : "00000000000";
    const payerName = user.name || "Cliente Mutual";

    // 💣 PAYLOAD ROBUSTO: Envia userId em todos os níveis (camelCase e snake_case)
    const payload = {
      userId: userIdToSend,        // Padrão CamelCase
      user_id: userIdToSend,       // Padrão SnakeCase (Fallback comum)
      amount: Number(amount),
      currency: "BRL",
      payMethod: "PIX",
      extra: {
        userId: userIdToSend,      // Redundância dentro de extra
        payerName: payerName,
        payerCPF: payerCPF,
      }
    };

    console.log("[AuthService] Payload Pix:", JSON.stringify(payload));

    const endpoints = [
      // 1️⃣ PRIORIDADE: USER-SERVICE (Proxy estável para evitar CORS)
      `https://mutual-fintech-user-service.vercel.app/api/wallet/deposit/pix`,
    ];

    let lastError: any;

    for (const url of endpoints) {
      try {
        console.log(`[AuthService] Attempting Pix via: ${url}`);
        const response = await fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let details = "";
          try {
            const errJson = JSON.parse(errorText);
            details = errJson.message || errJson.error || JSON.stringify(errJson);
          } catch {
            details = errorText;
          }

          console.error(`[AuthService] Error ${response.status} at ${url}:`, details);

          if (response.status === 404) continue;
          
          throw new Error(details || `Erro na API (${response.status})`);
        }

        const json = await response.json();
        console.log("[AuthService] Pix Success:", json);

        if (!json.ok) {
          throw new Error(json.error || json.message || "Falha na geração do Pix");
        }

        const qrCode =
          json.qrCodeText ||
          json.params?.qrcode ||
          json.qrCode ||
          json.data?.qrCode;

        const qrCodeImage =
          json.qrCodeImage ||
          json.params?.qrcode_img ||
          json.data?.qrCodeImage;

        if (!qrCode && !qrCodeImage) {
          throw new Error("O gateway não retornou o código Pix.");
        }

        return {
          qrCode: qrCode || "",
          qrCodeImage: qrCodeImage || "",
          orderId: json.orderNo || json.merOrderNo || json.data?.orderNo || "N/A",
          expiresAt: json.expiresAt || json.data?.expiresAt || "",
        };

      } catch (error: any) {
        console.error(`[AuthService] Exception with ${url}:`, error);
        lastError = error;
        if (error.message === "Failed to fetch" || error.message.includes("Network")) {
          continue;
        }
      }
    }

    throw lastError || new Error("Não foi possível conectar ao serviço de pagamentos.");
  },

  async createPixWithdraw(
    amount: number,
    pixKey: string,
    keyType: string
  ): Promise<{
    ok: boolean;
    status: string | null;
    amount: number;
    orderId: string;
  }> {
    const token = this.getToken();
    const user = this.getUser();

    if (!token) throw new Error("Sessão expirada. Faça login novamente.");
    if (!user) throw new Error("Usuário não autenticado. Faça login novamente.");

    // 🔎 ID do usuário
    const rawUserId: any =
      (user as any).id ??
      (user as any).userId ??
      (user as any).user_id ??
      (user as any)._id;

    if (!rawUserId) {
      console.error("[AuthService] Pix Withdraw - user sem ID:", user);
      throw new Error("ID do usuário não encontrado na sessão. Tente relogar.");
    }

    const numericId = parseInt(String(rawUserId), 10);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      console.error("[AuthService] Pix Withdraw - ID inválido:", rawUserId);
      throw new Error("ID do usuário inválido para operação de saque.");
    }

    const userIdToSend = numericId;

    // 📄 Dados do titular (CPF / Nome)
    const rawCPF = (
      (user as any).document ||
      (user as any).cpf ||
      (user as any).cnpj ||
      ""
    ).replace(/\D/g, "");

    const payerCPF = rawCPF.length >= 11 ? rawCPF : "00000000000";
    const payerName = (user as any).name || "Cliente Mutual";

    // 📦 SHOTGUN PAYLOAD: Satisfies BOTH Gateway and User Service validators
    // Gateway expects: bankCode, accountNumber, operatorId
    // User Service expects: key, keyType, bankCode
    const payload = {
      // Shared
      userId: userIdToSend,
      amount: Number(amount),
      currency: "BRL",
      
      // Gateway Specific
      operatorId: 1, 
      orderId: `wd-${Date.now()}`,
      accountNumber: pixKey,
      accountType: "PIX",
      payMethod: "PIX",
      accountHolder: {
        name: payerName.toUpperCase(),
        document: payerCPF,
      },

      // User Service Specific (Redundant but required by validator)
      key: pixKey,
      keyType: keyType,
      bankCode: keyType, // Mapped automatically as per instruction
      holder: {
        name: payerName.toUpperCase(),
        document: payerCPF,
      },
      extra: {
        payerName: payerName,
        payerCPF: payerCPF,
      }
    };

    console.log(
      "[AuthService] Sending Pix WITHDRAW Payload:",
      JSON.stringify(payload, null, 2)
    );

    // 🔗 GATEWAY ENDPOINT
    const endpoints = [
      `https://mutual-fintech-api-gateway.vercel.app/api/payout`,
      // Fallback
      `${API_URL}/wallet/withdraw/pix` 
    ];

    let lastError: any;

    for (const url of endpoints) {
        try {
            console.log(`[AuthService] Attempting Withdraw via: ${url}`);
            const response = await fetch(url, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            
            if (response.status === 404) {
                 console.warn(`[AuthService] 404 at ${url}, trying next...`);
                 continue;
            }

            const text = await response.text();
            let json: any;

            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error("[AuthService] Withdraw response not JSON:", text);
                throw new Error(`Erro na API de saque (${response.status}): ${text.substring(0, 100)}`);
            }

            console.log("[AuthService] Withdraw response:", json);

            if (!response.ok || json.ok === false) {
                const msg =
                    json.message ||
                    json.error ||
                    (json.details ? JSON.stringify(json.details) : "") ||
                    `Erro na API de saque (${response.status}).`;
                throw new Error(msg);
            }

            return {
                ok: true,
                status: json.status || json.data?.status || 'PENDING',
                amount: json.amount ?? json.data?.amount ?? amount,
                orderId:
                    json.orderNo ||
                    json.merOrderNo ||
                    json.orderId ||
                    json.data?.orderNo ||
                    payload.orderId,
            };

        } catch (error: any) {
             console.error(`[AuthService] Exception with ${url}:`, error);
             lastError = error;
             if (error.message === "Failed to fetch" || error.message.includes("Network")) {
                 continue;
             }
             throw error; 
        }
    }
    
    throw lastError || new Error("Não foi possível conectar ao serviço de saque.");
  },

  async createPaymentLink(linkData: { name: string; value: number }): Promise<any> {
    try {
        const pix = await this.createPixCharge(linkData.value);
        return {
            id: Date.now(),
            ...linkData,
            active: true,
            views: 0,
            paid: 0,
            qrCode: pix.qrCode,
            qrCodeImage: pix.qrCodeImage
        };
    } catch (e) {
        console.error("Failed to generate underlying Pix for link:", e);
        return {
            id: Date.now(),
            ...linkData,
            active: true,
            views: 0,
            paid: 0,
            qrCode: '',
            qrCodeImage: ''
        };
    }
  },

  logout() {
    localStorage.removeItem("mutual_token");
    localStorage.removeItem("mutual_user");
  },

  getToken() {
    return localStorage.getItem("mutual_token");
  },

  getUser(): User | null {
    const userStr = localStorage.getItem("mutual_user");
    if (!userStr) return null;
    try {
      const raw = JSON.parse(userStr);
      return normalizeUser(raw);
    } catch {
      return null;
    }
  },
};
