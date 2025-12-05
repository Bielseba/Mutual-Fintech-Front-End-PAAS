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
  const winBase = typeof window !== 'undefined' ? (window as any).API_BASE_URL : ''
  const fallback = typeof window !== 'undefined' ? window.location.origin : ''
  const base = (winBase && String(winBase)) || fallback
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

export async function listBeneficiaries(): Promise<Beneficiary[]> {
  const res = await fetch(`${API_BASE}/api/beneficiaries`, { credentials: 'include' })
  if (!res.ok) throw new Error('Falha ao listar favorecidos')
  return parseJsonSafe(res)
}

export async function createBeneficiary(payload: {
  name: string
  bank_name?: string
  document?: string
  pix_key: string
  key_type?: string
}): Promise<Beneficiary> {
  const res = await fetch(`${API_BASE}/api/beneficiaries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Falha ao criar favorecido')
  return parseJsonSafe(res)
}

export async function removeBeneficiary(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/beneficiaries/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Falha ao remover favorecido')
  return parseJsonSafe(res)
}
