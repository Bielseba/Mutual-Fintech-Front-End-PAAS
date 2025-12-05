
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

    if (appId && appId !== "undefined" && appId !== "null") {
        headers["app_id"] = String(appId);
        headers["client_id"] = String(appId); // Garante client_id para evitar erro 400
    }
    if (appSecret && appSecret !== "undefined" && appSecret !== "null") {
        headers["app_secret"] = String(appSecret);
        headers["client_secret"] = String(appSecret);
    }

    return headers;
  },

  // Headers completos para o Gateway (POST Pix)
  getGatewayHeaders() {
    return this.getBasicHeaders(); 
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
              if (json.data && json.data.isActive) {
                  return { 
                      maintenance: true, 
                      message: json.data.message || "O sistema está em manutenção programada." 
                  };
              }
          } else if (response.status === 503) {
              return { maintenance: true, message: "Serviço temporariamente indisponível." };
          }
          
          return { maintenance: false };
      } catch (error) {
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
      throw new Error(`Erro de conexão com API (${response.status}).`);
    }

    if (!response.ok) {
      if (data?.meta?.code === "USER_PENDING_APPROVAL") {
        throw new Error("Cadastro em análise: Seu acesso ainda não foi aprovado pelo administrador.");
      }
      const errorMessage = data.message || data.error || "Erro ao realizar login";
      throw new Error(Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage);
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

    // Save user Object
    localStorage.setItem("mutual_user", JSON.stringify(normalizedUser));

    // --- CORREÇÃO: SALVAR userId NO LOCALSTORAGE NO LOGIN ---
    const idToSave = normalizedUser.id || rawUser.id || rawUser.userId || rawUser.user_id;
    if (idToSave) {
        localStorage.setItem("userId", String(idToSave));
    } else {
        console.warn("UserID não encontrado na resposta de login para salvar.");
    }

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
      if (!data.document) throw new Error("CPF é obrigatório para Pessoa Física.");
      payload.document = data.document.replace(/\D/g, "");
    } else {
      if (!data.cnpj) throw new Error("CNPJ é obrigatório para Pessoa Jurídica.");
      if (!data.companyName) throw new Error("Razão Social é obrigatória.");
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
        const response = await fetch(`${API_URL}/users/${user.id}/wallet/ledger`, {
            method: "GET",
            headers: headers as any
        });
        
        if (!response.ok) {
            const fallbackResponse = await fetch(`${API_URL}/me/wallet/ledger`, {
                method: "GET",
                headers: headers as any
            });
            if (fallbackResponse.ok) {
          const json = await fallbackResponse.json();
          const walletId = json.walletId || json.wallet_id;
          let list = Array.isArray(json.ledger)
            ? json.ledger
            : (Array.isArray(json.data) ? json.data : []);
          if (walletId && Array.isArray(list)) {
            list = list.filter((tx: any) => (tx.wallet_id ?? tx.walletId) === walletId);
          }
          // Retornar TODAS as transações, não filtrar apenas PIX
          return this._mapLedger(list);
            }
            throw new Error("Falha ao buscar extrato");
        }
        
      const json = await response.json();
      const walletId = json.walletId || json.wallet_id;
      let list = Array.isArray(json.ledger)
        ? json.ledger
        : (Array.isArray(json.data) ? json.data : []);
      if (walletId && Array.isArray(list)) {
        list = list.filter((tx: any) => (tx.wallet_id ?? tx.walletId) === walletId);
      }
      // Retornar TODAS as transações, não filtrar apenas PIX
      // O filtro estava escondendo transações importantes
      return this._mapLedger(list);
    } catch (e) {
        console.error("Erro getWalletLedger:", e);
        return [];
    }
  },

  _mapLedger(list: any[]): Transaction[] {
      return list.map((tx: any) => {
        const rawAmount = Number(tx.amount ?? tx.value ?? 0);
        const direction = String(tx.direction ?? tx.type ?? (rawAmount >= 0 ? 'CREDIT' : 'DEBIT')).toUpperCase();
        const amount = direction === 'DEBIT' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
        const created = tx.created_at || tx.createdAt || tx.date || new Date().toISOString();
        const meta = tx.meta || {};
        // Extract E2E/tradeNo from raw_response if present
        let e2e: string | undefined = undefined;
        const rawResp = meta.raw_response || meta.rawResponse || tx.raw_response || tx.rawResponse;
        if (rawResp) {
          try {
            const obj = typeof rawResp === 'string' ? JSON.parse(rawResp) : rawResp;
            e2e = obj.tradeNo || obj.txid || obj.endToEndId || obj.orderNo || undefined;
          } catch {
            // Non-JSON string: try regex extraction for tradeNo/txid/endToEndId
            if (typeof rawResp === 'string') {
              const s = rawResp;
              const mTrade = s.match(/"?tradeNo"?\s*[:=]\s*"?([A-Za-z0-9_-]+)"?/i);
              const mTxid = s.match(/"?(txid|endToEndId)"?\s*[:=]\s*"?([A-Za-z0-9_-]+)"?/i);
              e2e = (mTrade && mTrade[1]) || (mTxid && mTxid[2]) || undefined;
            }
          }
        }
        // Fallbacks
        if (!e2e) {
          e2e = meta.tradeNo || meta.txid || meta.endToEndId || meta.orderNo || tx.txid || tx.endToEndId || tx.orderNo || undefined;
        }
        const balanceAfter = (typeof meta.newBalance === 'number')
          ? Number(meta.newBalance)
          : (typeof meta.previousBalance === 'number')
            ? Number(meta.previousBalance) + amount
            : undefined;
        // Formatar descrição baseado no tipo de transação
        let formattedDescription = tx.description || (direction === 'CREDIT' ? 'Crédito' : 'Débito');
        
        // Se for taxa de transação, manter a descrição original
        if (meta.feeType === 'TRANSACTION_FEE' || /Taxa de transação/i.test(formattedDescription)) {
          formattedDescription = 'Taxa de transação';
        }
        // Formatar depósitos e saques
        else if (/PIX DEPOSIT|Depósito Pix|Depósito STARPAGO/i.test(formattedDescription)) {
          formattedDescription = 'Depósito Pix';
        }
        else if (/PIX WITHDRAW|PIX OUT|Saque Pix|Saque STARPAGO/i.test(formattedDescription)) {
          // Remover informações de taxa da descrição principal
          formattedDescription = formattedDescription.replace(/\s*\+\s*Taxa:.*$/i, '').trim();
          if (!formattedDescription || formattedDescription === 'PIX OUT') {
            formattedDescription = 'Saque Pix';
          }
        }
        
        // Extrair valores de taxa e valores totais do meta
        // IMPORTANTE: Se meta for string, tentar parsear
        let parsedMeta = meta;
        if (typeof meta === 'string') {
          try {
            parsedMeta = JSON.parse(meta);
          } catch {
            // Tentar parsear como JSONB do PostgreSQL
            try {
              parsedMeta = JSON.parse(meta.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
            } catch {
              parsedMeta = {};
            }
          }
        }

        const originalAmount = typeof parsedMeta.originalAmount === 'number' ? parsedMeta.originalAmount : undefined;
        const totalAmount = typeof parsedMeta.totalAmount === 'number' ? parsedMeta.totalAmount : undefined;
        const finalAmount = typeof parsedMeta.finalAmount === 'number' ? parsedMeta.finalAmount : undefined;
        const feeAmount = typeof parsedMeta.feeAmount === 'number' ? parsedMeta.feeAmount : undefined;
        
        // Para exibição: usar totalAmount se disponível (valor total da transação), senão usar originalAmount, senão usar amount
        // O amount no ledger é o valor que foi creditado/debitado (já com taxa aplicada)
        // Mas queremos exibir o valor total da transação
        const displayAmount = totalAmount !== undefined 
          ? totalAmount 
          : (originalAmount !== undefined 
            ? originalAmount 
            : Math.abs(rawAmount));
        
        return {
          id: tx.id || tx._id || 'TX-UNK',
          amount: direction === 'DEBIT' ? -Math.abs(displayAmount) : Math.abs(displayAmount), // Exibir valor total da transação
          date: created,
          description: formattedDescription,
          type: direction === 'DEBIT' ? 'DEBIT' : 'CREDIT',
          status: (tx.status || 'COMPLETED') as any,
          sender: tx.meta?.sender || tx.sender || undefined,
          recipient: tx.meta?.recipient || tx.recipient || undefined,
          e2e,
          document: tx.meta?.document || tx.document || undefined,
          payerName: tx.meta?.payer_name || tx.meta?.payerName || tx.payer_name || tx.payerName || undefined,
          providerOrderNo: tx.meta?.providerOrderNo || tx.providerOrderNo || undefined,
          balanceAfter,
          // Adicionar informações de taxa e valores
          originalAmount: originalAmount || totalAmount || Math.abs(rawAmount), // Valor original da transação
          totalAmount: totalAmount || originalAmount || Math.abs(rawAmount), // Valor total da transação (com taxa)
          finalAmount: finalAmount || Math.abs(rawAmount), // Valor final creditado/debitado (após taxa)
          feeAmount
        } as Transaction;
      });
  },

  // PIX IN (Depósito) - CORRIGIDO PARA LER json.pix.qrcode
  async createPixCharge(amount: number): Promise<{
    qrCode: string;
    qrCodeImage: string;
    orderId: string;
    expiresAt: string;
  }> {
    const user = this.getUser();
    if (!user || !user.id) throw new Error("Sessão expirada. Faça login novamente.");
    const userId = Number(user.id);
    const url = `${API_URL}/wallet/deposit/pix?userId=${userId}`;
    const headers = this.getGatewayHeaders();
    
    const payload = {
      amount: Number(amount),
      currency: "BRL",
      payMethod: "PIX",
      userId: userId 
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
        throw new Error("Falha ao gerar Pix: " + (errText || response.statusText));
    }

    const json = await response.json();
    
    // CORREÇÃO: Mapeamento para estrutura aninhada (json.pix.qrcode)
    const qrCode = json.pix?.qrcode || json.qrCodeText || json.qrCode || json.data?.qrCode || json.emvqrcps;
    
    // Imagem base64 opcional (json.pix.qrCodeImage ou outros formatos)
    const qrCodeImage = json.pix?.qrCodeImage || json.qrCodeImage || json.qrCodeBase64 || json.data?.qrCodeImage;
    
    // Mapeamento de ID e Expiração
    const orderId = json.id || json.orderNo || json.data?.orderNo || "N/A";
    const expiresAt = json.pix?.expirationDate || json.expiresAt || "";

    if (!qrCode && !qrCodeImage) {
        console.error("Payload JSON recebido:", json);
        throw new Error("QR Code não retornado pela API.");
    }

    return { qrCode, qrCodeImage, orderId, expiresAt: expiresAt };
  },

  // PIX OUT (Saque)
  async createPixWithdraw(amount: number, pixKey: string, keyType: string): Promise<any> {
      const headers = this.getGatewayHeaders();

      // 1. Recuperar userId do localStorage
      let userId = Number(localStorage.getItem("userId"));

      // 2. Fallback robusto se userId não estiver limpo
      if (!userId || isNaN(userId)) {
          const userStr = localStorage.getItem("mutual_user");
          if (userStr) {
              try {
                  const u = JSON.parse(userStr);
                  const extractedId = u.id || u.userId || u.user_id || u._id;
                  if (extractedId && !isNaN(Number(extractedId))) {
                      userId = Number(extractedId);
                      localStorage.setItem("userId", String(userId));
                  }
              } catch (e) {
                  console.error("Erro ao recuperar ID do usuário salvo", e);
              }
          }
      }

      if (!userId || isNaN(userId) || userId <= 0) {
          throw new Error("Sessão inválida (UserID ausente). Por favor, saia e entre novamente.");
      }

      // 3. Mapear o keyType para o formato StarPago
      const inputType = keyType.toUpperCase();
      let apiType = 'evp';

      if (inputType === 'CPF') apiType = 'cpf';
      else if (inputType === 'CNPJ') apiType = 'cnpj';
      else if (inputType === 'EMAIL') apiType = 'email';
      else if (inputType === 'PHONE' || inputType === 'CELULAR' || inputType === 'MOBILE') apiType = 'mobile';
      else apiType = 'evp';

      // 4. Montar Payload conforme documentação StarPago
      // bankCode é obrigatório e é o mesmo que keyType na API StarPago
      const payload = {
          userId: userId,
          amount: amount,
          key: pixKey,
          keyType: apiType,
          bankCode: apiType // bankCode é o mesmo que keyType na StarPago
      };
      
      console.log("Enviando Saque Payload:", payload);

      const response = await fetch(`${API_URL}/wallet/withdraw/pix`, {
          method: "POST",
          headers: headers as any,
          body: JSON.stringify(payload)
      });
      
      const json = await response.json();
      if (!response.ok) {
          // Mensagem mais clara baseada no tipo de erro
          let errorMsg = json.message || json.error || "Erro ao processar saque";
          
          // Se for erro do gateway (502), mensagem mais amigável
          if (response.status === 502 || json.error === 'GatewayPixWithdrawFailed') {
              errorMsg = json.message || "O serviço de pagamento está temporariamente indisponível. Tente novamente em alguns instantes.";
          }
          
          // Se for erro de validação ou saldo insuficiente
          if (response.status === 400) {
              if (json.error === 'InsufficientFunds' || json.details?.message?.includes('Saldo insuficiente')) {
                  errorMsg = json.details?.message || "Saldo insuficiente para realizar o saque.";
              } else {
                  errorMsg = json.message || json.error || "Dados inválidos. Verifique as informações e tente novamente.";
              }
          }
          
          throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }
      
      return {
          ok: true,
          status: 'PENDING',
          orderId: json.orderNo || json.id || 'WD-' + Date.now(),
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
          console.log('[getMyFees] === INÍCIO FRONTEND ===');
          const token = this.getToken();
          const user = this.getUser();
          console.log('[getMyFees] Token presente?', !!token);
          console.log('[getMyFees] User do localStorage:', user);
          
          const headers = this.getBasicHeaders();
          console.log('[getMyFees] Headers preparados:', {
              authorization: headers.Authorization ? 'Bearer ***' : 'ausente',
              app_id: headers.app_id || 'ausente',
              client_id: headers.client_id || 'ausente'
          });
          
          const url = `${API_URL}/me/fees`;
          console.log('[getMyFees] URL da requisição:', url);
          
          const res = await fetch(url, { headers: headers as any });
          console.log('[getMyFees] Status da resposta:', res.status, res.statusText);
          console.log('[getMyFees] Headers da resposta:', Object.fromEntries(res.headers.entries()));
          
          if (!res.ok) {
              const errorText = await res.text();
              console.error('[getMyFees] ❌ Erro HTTP:', res.status, res.statusText);
              console.error('[getMyFees] Corpo da resposta de erro:', errorText);
              return null;
          }
          
          const json = await res.json();
          console.log('[getMyFees] Resposta JSON completa:', JSON.stringify(json, null, 2));
          
          if (json.ok && json.data) {
              const result = { 
                  userId: json.data.userId, 
                  pixInPercent: Number(json.data.pixInPercent) || 0, 
                  pixOutPercent: Number(json.data.pixOutPercent) || 0,
                  pixInFeeType: json.data.pixInFeeType || 'PERCENT',
                  pixInFeeValue: Number(json.data.pixInFeeValue) || 0,
                  pixOutFeeType: json.data.pixOutFeeType || 'PERCENT',
                  pixOutFeeValue: Number(json.data.pixOutFeeValue) || 0
              };
              console.log('[getMyFees] ✅ Dados parseados:', result);
              return result;
          }
          
          // Fallback: tentar ler diretamente se não estiver em json.data
          if (json.pixInPercent !== undefined || json.pixOutPercent !== undefined) {
              const result = {
                  userId: json.userId || null,
                  pixInPercent: Number(json.pixInPercent) || 0,
                  pixOutPercent: Number(json.pixOutPercent) || 0,
                  pixInFeeType: json.pixInFeeType || 'PERCENT',
                  pixInFeeValue: Number(json.pixInFeeValue) || 0,
                  pixOutFeeType: json.pixOutFeeType || 'PERCENT',
                  pixOutFeeValue: Number(json.pixOutFeeValue) || 0
              };
              console.log('[getMyFees] ✅ Dados parseados (fallback):', result);
              return result;
          }
          
          console.warn('[getMyFees] ⚠️ Formato de resposta inesperado:', json);
          return null;
      } catch (error) {
          console.error('[getMyFees] ❌ Erro na requisição:', error);
          if (error instanceof Error) {
              console.error('[getMyFees] Mensagem de erro:', error.message);
              console.error('[getMyFees] Stack:', error.stack);
          }
          return null;
      }
  },

  logout() {
    localStorage.removeItem("mutual_token");
    localStorage.removeItem("mutual_user");
    localStorage.removeItem("app_id");
    localStorage.removeItem("app_secret");
    localStorage.removeItem("userId");
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
