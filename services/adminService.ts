import { MedSummary, MedAlert } from '../types';

const API_URL = "https://mutual-fintech-user-service.vercel.app/api";

const getToken = () => localStorage.getItem("mutual_token");

const fetchAdmin = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  if (!token) throw new Error("Sessão expirada.");

  const res = await fetch(`${API_URL}/admin/med${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  // Handle 404 gracefully (Feature not deployed yet)
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
            // Fallback mock if endpoint is 404
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

        // Unwrap array from various possible response structures
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