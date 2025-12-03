
import { MedSummary, MedAlert } from '../types';

const API_URL = "https://api.ominigateway.com.br/api";

const getToken = () => localStorage.getItem("mutual_token");

const getCredentials = () => {
    let appId = localStorage.getItem("app_id");
    let appSecret = localStorage.getItem("app_secret");

    // Fallback if missing in direct keys but present in user object
    if (!appId || !appSecret) {
        const userStr = localStorage.getItem("mutual_user");
        if (userStr) {
             try {
                const u = JSON.parse(userStr);
                appId = appId || u.appId || u.app_id;
                appSecret = appSecret || u.clientSecret || u.app_secret_hash || u.client_secret;
             } catch(e) {}
        }
    }
    return { appId, appSecret };
};

const fetchAdmin = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const { appId, appSecret } = getCredentials();

  if (!token) throw new Error("Sessão expirada.");

  const headers: any = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
  };

  if (appId && appId !== "undefined") headers["app_id"] = String(appId);
  if (appSecret && appSecret !== "undefined") headers["app_secret"] = String(appSecret);

  const res = await fetch(`${API_URL}/admin/med${endpoint}`, {
    ...options,
    headers: headers,
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
