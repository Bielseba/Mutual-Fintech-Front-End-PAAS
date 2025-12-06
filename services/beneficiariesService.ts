export type Beneficiary = {
  id: number
  name: string
  bank_name?: string | null
  document?: string | null
  pix_key: string
  key_type?: string | null
  created_at?: string
}

const API_BASE = (() => {
  const DEFAULT_BACKEND = 'https://mutual-fintech-user-service.vercel.app'
  const viteEnv = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_BASE_URL : '') || ''
  const winBase = typeof window !== 'undefined' ? (window as any).API_BASE_URL : ''
  const base = (viteEnv && String(viteEnv)) || (winBase && String(winBase)) || DEFAULT_BACKEND
  return base.replace(/\/$/, '')
})()

async function parseJsonSafe(res: Response) {
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  if (!ct.includes('application/json')) {
    throw new Error(text.startsWith('<!DOCTYPE') ? 'A URL da API está incorreta (HTML recebido). Configure o proxy ou API_BASE_URL.' : text)
  }
  return JSON.parse(text)
}

function getAuthToken(): string {
  // Prefer the key used by authService
  const mutual = localStorage.getItem('mutual_token') || ''
  if (mutual) return mutual
  // Fallbacks
  const omi = localStorage.getItem('omi_token') || ''
  if (omi) return omi
  const fromAuthSvc = (window as any)?.authService?.getToken?.()
  return fromAuthSvc || ''
}

export async function listBeneficiaries(userId?: number): Promise<Beneficiary[]> {
  const token = getAuthToken()
  if (!token) throw new Error('Token ausente. Faça login para listar favorecidos.')
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(userId && Number.isFinite(userId) ? { 'x-user-id': String(userId) } : {}),
  }
  const headers = (window as any)?.authService?.getBasicHeaders?.() || baseHeaders
  const urls = [
    ...(userId && Number.isFinite(userId) ? [`${API_BASE}/api/users/${userId}/beneficiaries`] : []),
    `${API_BASE}/api/beneficiaries`,
    // Public fallback (no JWT needed) using header/query userId
    ...(userId && Number.isFinite(userId) ? [`${API_BASE}/api/beneficiaries-public?userId=${userId}`] : []),
  ]
  let res: Response | null = null
  for (const url of urls) {
    res = await fetch(url, { headers, mode: 'cors', referrerPolicy: 'no-referrer' })
    if (res.ok || res.status !== 404) break
  }
  if (!res || !res.ok) {
    const text = res ? (await res.text().catch(() => '')) : ''
    throw new Error(`Falha ao listar favorecidos (HTTP ${res?.status ?? 'NA'}) ${text || ''}`.trim())
  }
  return parseJsonSafe(res)
}

export async function createBeneficiary(payload: {
  name: string
  bank_name?: string
  document?: string
  pix_key: string
  key_type?: string
}, userId?: number): Promise<Beneficiary> {
  const token = getAuthToken()
  if (!token) throw new Error('Token ausente. Faça login para criar favorecido.')
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(userId && Number.isFinite(userId) ? { 'x-user-id': String(userId) } : {}),
  }
  const headers = (window as any)?.authService?.getBasicHeaders?.() || baseHeaders
  const urls = [
    ...(userId && Number.isFinite(userId) ? [`${API_BASE}/api/users/${userId}/beneficiaries`] : []),
    `${API_BASE}/api/beneficiaries`,
    ...(userId && Number.isFinite(userId) ? [`${API_BASE}/api/beneficiaries-public?userId=${userId}`] : []),
  ]
  let res: Response | null = null
  for (const url of urls) {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      mode: 'cors',
      referrerPolicy: 'no-referrer',
    })
    if (res.ok || res.status !== 404) break
  }
  if (!res || !res.ok) {
    const text = res ? (await res.text().catch(() => '')) : ''
    throw new Error(`Falha ao criar favorecido (HTTP ${res?.status ?? 'NA'}) ${text || ''}`.trim())
  }
  return parseJsonSafe(res)
}

export async function removeBeneficiary(id: number, userId?: number): Promise<{ success: boolean }> {
  const token = getAuthToken()
  if (!token) throw new Error('Token ausente. Faça login para remover favorecido.')
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(userId && Number.isFinite(userId) ? { 'x-user-id': String(userId) } : {}),
  }
  const headers = (window as any)?.authService?.getBasicHeaders?.() || baseHeaders
  const urls = [
    ...(userId && Number.isFinite(userId) ? [`${API_BASE}/api/users/${userId}/beneficiaries/${id}`] : []),
    `${API_BASE}/api/beneficiaries/${id}`,
    ...(userId && Number.isFinite(userId) ? [`${API_BASE}/api/beneficiaries-public/${id}?userId=${userId}`] : []),
  ]
  let res: Response | null = null
  for (const url of urls) {
    res = await fetch(url, {
      method: 'DELETE',
      headers,
      mode: 'cors',
      referrerPolicy: 'no-referrer',
    })
    if (res.ok || res.status !== 404) break
  }
  if (!res || !res.ok) {
    const text = res ? (await res.text().catch(() => '')) : ''
    throw new Error(`Falha ao remover favorecido (HTTP ${res?.status ?? 'NA'}) ${text || ''}`.trim())
  }
  return parseJsonSafe(res)
}
