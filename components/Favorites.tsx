import React, { useEffect, useMemo, useState } from 'react'
import { Beneficiary, listBeneficiaries, removeBeneficiary, updateBeneficiary } from '../services/beneficiariesService'
import { Pencil, Trash2, Loader2, Search, Star } from 'lucide-react'

function maskDocument(doc?: string | null) {
  if (!doc) return '-'
  const digits = doc.replace(/\D/g, '')
  if (digits.length < 6) return '***.******.***'
  const middle = digits.slice(3, 9)
  return `***.${middle}.***`
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).join(' ')
}

const Favorites: React.FC = () => {
  const [items, setItems] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; bank_name?: string | null; document?: string | null; pix_key: string; key_type?: string | null }>({ name: '', bank_name: '', document: '', pix_key: '', key_type: 'chave' })

  async function resolveUserId(): Promise<number> {
    const uidFromAuth = (window as any)?.authService?.getCurrentUser?.()?.id
    const uidFromStorage = Number(localStorage.getItem('omi_user_id') || '')
    let userId = Number.isFinite(uidFromAuth) ? Number(uidFromAuth) : (Number.isFinite(uidFromStorage) ? uidFromStorage : undefined as any)
    if (!userId) {
      const token = (window as any)?.authService?.getToken?.() || localStorage.getItem('omi_token') || ''
      if (token.includes('.')) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const subId = Number(payload?.userId || payload?.sub)
          if (Number.isFinite(subId)) userId = subId as any
        } catch {}
      }
    }
    if (!userId) throw new Error('ID do usuário não encontrado. Faça login novamente.')
    return userId
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const userId = await resolveUserId()
      const data = await listBeneficiaries(userId)
      setItems(data)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar favorecidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.bank_name || '').toLowerCase().includes(q) ||
      (b.pix_key || '').toLowerCase().includes(q)
    )
  }, [items, query])

  const startEdit = (b: Beneficiary) => {
    setEditingId(b.id)
    setEditForm({
      name: b.name || '',
      bank_name: b.bank_name || '',
      document: b.document || '',
      pix_key: b.pix_key || '',
      key_type: b.key_type || 'chave',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', bank_name: '', document: '', pix_key: '', key_type: 'chave' })
  }

  const saveEdit = async () => {
    if (editingId == null) return
    setLoading(true)
    setError(null)
    try {
      const userId = await resolveUserId()
      await updateBeneficiary(editingId, editForm, userId)
      setEditingId(null)
      await refresh()
    } catch (e: any) {
      setError(e.message || 'Falha ao editar favorecido')
    } finally {
      setLoading(false)
    }
  }

  const onRemove = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      const userId = await resolveUserId()
      await removeBeneficiary(id, userId)
      await refresh()
    } catch (e: any) {
      setError(e.message || 'Falha ao remover favorecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Favorecidos</h2>
          <p className="text-xs text-slate-500">Gerencie seus favorecidos cadastrados</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Buscar favorecidos..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm mb-3">{error}</div>}
        {loading && <div className="flex items-center gap-2 text-slate-500 mb-3"><Loader2 className="w-4 h-4 animate-spin"/> Carregando...</div>}

        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className={`rounded-xl border ${editingId===b.id ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'} bg-white p-4 flex items-start justify-between`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <Star className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  {editingId === b.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-600">Nome</label>
                        <input className="mt-1 w-full border border-slate-200 rounded-xl p-2" value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">Banco</label>
                        <input className="mt-1 w-full border border-slate-200 rounded-xl p-2" value={editForm.bank_name || ''} onChange={e=>setEditForm({...editForm, bank_name: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600">Documento</label>
                        <input className="mt-1 w-full border border-slate-200 rounded-xl p-2" value={editForm.document || ''} onChange={e=>setEditForm({...editForm, document: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-600">Chave Pix</label>
                        <input className="mt-1 w-full border border-slate-200 rounded-xl p-2" value={editForm.pix_key} onChange={e=>setEditForm({...editForm, pix_key: e.target.value})} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-900">{shortName(b.name)}</div>
                      <div className="text-sm text-slate-600">{b.bank_name || '-'} • {maskDocument(b.document)}</div>
                      <div className="text-xs text-slate-500 break-all">{b.pix_key}</div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {editingId === b.id ? (
                  <>
                    <button onClick={saveEdit} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Salvar</button>
                    <button onClick={cancelEdit} className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(b)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg" title="Editar"><Pencil className="w-4 h-4 text-slate-600"/></button>
                    <button onClick={() => onRemove(b.id)} className="p-2 bg-red-50 hover:bg-red-100 rounded-lg" title="Excluir"><Trash2 className="w-4 h-4 text-red-600"/></button>
                  </>
                )}
              </div>
            </div>
          ))}
          {filtered.length===0 && (
            <div className="p-6 text-center text-slate-500">Nenhum favorecido encontrado.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Favorites
