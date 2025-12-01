
import { MedSummary, MedAlert } from '../types';
import { authService } from './authService';

const API_URL = "https://mutual-fintech-user-service.vercel.app/api";
// const API_URL = "http://localhost:3000/api";

const getToken = () => localStorage.getItem("mutual_token");

const getCredentials = () => {
    let appId = localStorage.getItem("app_id");
    let appSecret = localStorage.getItem("app_secret");

    // Helper para validar se o valor é válido
    const isValid = (val: string | null | undefined): boolean => {
      return val !== null && val !== undefined && val !== "" && val !== "undefined" && val !== "null";
    };

    // Fallback if missing in direct keys but present in user object
    if (!isValid(appId) || !isValid(appSecret)) {
        const userStr = localStorage.getItem("mutual_user");
        if (userStr) {
             try {
                const u = JSON.parse(userStr);
                if (!isValid(appId)) {
                  appId = u.appId || u.app_id || null;
                }
                if (!isValid(appSecret)) {
                  appSecret = u.clientSecret || u.app_secret_hash || u.client_secret || null;
                }
                
                // Persist found credentials apenas se forem válidos
                if (isValid(appId)) localStorage.setItem("app_id", String(appId));
                if (isValid(appSecret)) localStorage.setItem("app_secret", String(appSecret));
             } catch(e) {}
        }
    }
    return { 
      appId: isValid(appId) ? appId : null, 
      appSecret: isValid(appSecret) ? appSecret : null 
    };
};

const fetchAdmin = async (endpoint: string, options: RequestInit = {}) => {
  // Garante que as credenciais estejam disponíveis antes da requisição
  try {
    await authService.ensureCredentials();
  } catch (error) {
    console.warn("Erro ao garantir credenciais no adminService:", error);
    // Continua mesmo se não conseguir buscar credenciais (pode ter no localStorage)
  }

  const token = getToken();
  const { appId, appSecret } = getCredentials();

  // Validação obrigatória do token
  if (!token || token.trim() === '') {
    throw new Error("Sessão expirada. Token não encontrado.");
  }

  // Garante que o token Authorization sempre esteja presente e não seja sobrescrito
  // Mescla headers customizados primeiro, depois adiciona os obrigatórios
  const customHeaders = (options.headers as Record<string, string>) || {};
  const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders, // Headers customizados primeiro
      "Authorization": `Bearer ${token}`, // Authorization sempre presente (não pode ser sobrescrito)
  };

  // Adiciona credenciais apenas se forem válidas
  if (appId) headers["app_id"] = String(appId);
  if (appSecret) headers["app_secret"] = String(appSecret);

  const res = await fetch(`${API_URL}/admin/med${endpoint}`, {
    ...options,
    headers: headers, // Headers finais garantem que Authorization está presente
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || json.error || "Erro na API Admin");
    } catch {
      throw new Error(`Erro na API Admin: ${res.status}`);
    }
  }

  return res.json();
};

export const adminService = {
  async getMedSummary(): Promise<MedSummary> {
    try {
        const res = await fetchAdmin('/summary');
        if (!res) {
            return { openCount: 0, blockedAmount: 0, totalCount: 0, hasMed: false };
        }
        return res.data || res;
    } catch (e) {
        console.error("Failed to load MED summary:", e);
        return { openCount: 0, blockedAmount: 0, totalCount: 0, hasMed: false };
    }
  },

  async getMedList(filters: { status?: string; search?: string } = {}): Promise<MedAlert[]> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    try {
        const res = await fetchAdmin(`?${params.toString()}`);
        if (!res) return [];

        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.list && Array.isArray(res.list)) return res.list;
        
        return [];
    } catch (e) {
        console.error("Failed to load MED list:", e);
        return [];
    }
  },

  async getMedDetail(id: string): Promise<MedAlert> {
    const res = await fetchAdmin(`/${id}`);
    if (!res) throw new Error("Detalhes não encontrados (404).");
    return res.data || res;
  },

  async sendMedDefense(id: string, data: { defenseText: string; attachments?: any[] }) {
    return fetchAdmin(`/${id}/defense`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async medAction(id: string, data: { action: 'ACCEPT_REFUND' | 'REJECT_REFUND' | 'MARK_UNDER_REVIEW'; amount?: number; note?: string }) {
    return fetchAdmin(`/${id}/action`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
};
