import React, { useEffect, useMemo, useState } from 'react'
import { listBeneficiaries, createBeneficiary, removeBeneficiary, Beneficiary } from '../services/beneficiariesService'
import { ClipboardCopy, Plus, Trash2 } from 'lucide-react'

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

export default function PixBeneficiaries() {
  const [items, setItems] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [step, setStep] = useState<'list' | 'create' | 'confirm' | 'done'>('list')
  const [form, setForm] = useState({ name: '', bank_name: '', document: '', pix_key: '', key_type: 'chave' })
  const [pending, setPending] = useState<Beneficiary | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const uidFromAuth = (window as any)?.authService?.getCurrentUser?.()?.id
      const uidFromStorage = Number(localStorage.getItem('omi_user_id') || '')
      let userId = Number.isFinite(uidFromAuth) ? Number(uidFromAuth) : (Number.isFinite(uidFromStorage) ? uidFromStorage : undefined)
      if (!userId) {
        const token = (window as any)?.authService?.getToken?.() || localStorage.getItem('omi_token') || ''
        if (token.includes('.')) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const subId = Number(payload?.userId || payload?.sub)
            if (Number.isFinite(subId)) userId = subId
          } catch {}
        }
      }
      if (!userId) throw new Error('ID do usuário não encontrado. Faça login novamente.')
      const data = await listBeneficiaries(userId)
      setItems(data)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar favorecidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function onCreate() {
    // Não salvar ainda; apenas preparar para confirmar
    setError(null)
    const beneficiaryDraft: Beneficiary = {
      id: 0,
      name: form.name,
      bank_name: form.bank_name,
      document: form.document,
      pix_key: form.pix_key,
      key_type: (form as any).key_type || 'chave',
      user_id: Number(localStorage.getItem('omi_user_id') || 0) || undefined as any,
    } as any
    setPending(beneficiaryDraft)
    setStep('confirm')
  }

  async function onRemove(id: number) {
    setLoading(true)
    try {
      const uidFromAuth = (window as any)?.authService?.getCurrentUser?.()?.id
      const uidFromStorage = Number(localStorage.getItem('omi_user_id') || '')
      let userId = Number.isFinite(uidFromAuth) ? Number(uidFromAuth) : (Number.isFinite(uidFromStorage) ? uidFromStorage : undefined)
      if (!userId) {
        const token = (window as any)?.authService?.getToken?.() || localStorage.getItem('omi_token') || ''
        if (token.includes('.')) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const subId = Number(payload?.userId || payload?.sub)
            if (Number.isFinite(subId)) userId = subId
          } catch {}
        }
      }
      if (!userId) throw new Error('ID do usuário não encontrado. Faça login novamente.')
      await removeBeneficiary(id, userId)
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.bank_name || '').toLowerCase().includes(q) ||
      b.pix_key.toLowerCase().includes(q)
    )
  }, [items, query])

  const steps = [
    { key: 'list', title: 'Digitar', index: 1 },
    { key: 'confirm', title: 'Confirmar', index: 2 },
    { key: 'done', title: 'Finalização', index: 3 },
  ] as const

  const Stepper = (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        {steps.map((s, idx) => {
          const isActive = step === s.key
          const currentIndex = steps.findIndex(st => st.key === step)
          const isCompleted = currentIndex > idx
          const circleClass = isActive
            ? 'bg-indigo-600 text-white'
            : isCompleted
              ? 'bg-green-600 text-white'
              : 'bg-slate-200 text-slate-700'
          const barClass = isCompleted ? 'bg-green-600' : 'bg-slate-200'
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${circleClass}`}>{s.index}</div>
                <div className={`mt-1 text-xs ${isActive ? 'text-indigo-700 font-semibold' : 'text-slate-600'}`}>{s.title}</div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-14 h-[2px] rounded ${barClass}`}></div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  const ListView = (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-sm">Importante! Para garantir a segurança da sua transação, você precisará confirmar sua identidade digitando sua senha.</div>
      {Stepper}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">PIX para Favorecido</h2>
            <p className="text-xs text-slate-500">Selecione um favorecido e realize a transferência</p>
          </div>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center gap-2" onClick={() => setStep('create')}>
            <Plus size={16}/> Novo favorecido
          </button>
        </div>
        <input className="w-full border border-slate-200 rounded-xl p-3 mb-3" placeholder="Nome, banco ou chave PIX" value={query} onChange={e=>setQuery(e.target.value)} />
        {loading && <div>Carregando...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {filtered.map(b => (
            <div key={b.id} className="flex items-center justify-between border rounded-xl p-3">
              <div>
                <div className="font-semibold">{shortName(b.name)}</div>
                <div className="text-sm text-slate-600">{b.bank_name || '-'} • {maskDocument(b.document)}</div>
                <div className="text-xs text-slate-500">{b.pix_key}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => onRemove(b.id)}>Excluir</button>
                <button className="px-2 py-1 bg-indigo-600 text-white rounded" onClick={() => {
                  const params = new URLSearchParams({
                    beneficiaryId: String(b.id),
                    name: b.name,
                    pix_key: b.pix_key,
                    key_type: String(b.key_type || 'chave'),
                  })
                  window.location.href = `/pix-out?${params.toString()}`
                }}>Enviar Pix</button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div className="text-slate-500">Nenhum favorecido encontrado.</div>}
        </div>
        <div className="mt-4">
          <button className="w-full py-3 bg-slate-400 text-white rounded-xl font-semibold">Continuar</button>
        </div>
      </div>
    </div>
  )

  const CreateView = (
    <div className="space-y-4 max-w-2xl">
      <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-sm">Importante! Para garantir a segurança da sua transação, você precisará confirmar sua identidade digitando sua senha.</div>
      {Stepper}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Novo favorecido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Nome completo</label>
            <input className="mt-1 w-full border border-slate-200 rounded-xl p-3" placeholder="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Banco (opcional)</label>
            <input className="mt-1 w-full border border-slate-200 rounded-xl p-3" placeholder="Banco (opcional)" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Documento (CPF/CNPJ opcional)</label>
            <input className="mt-1 w-full border border-slate-200 rounded-xl p-3" placeholder="Documento (CPF/CNPJ opcional)" value={form.document} onChange={e => setForm({ ...form, document: e.target.value })}/>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Chave Pix</label>
            <input className="mt-1 w-full border border-slate-200 rounded-xl p-3" placeholder="Chave Pix" value={form.pix_key} onChange={e => setForm({ ...form, pix_key: e.target.value })}/>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button className={`px-4 py-2 rounded-xl font-semibold ${(!form.name || !form.pix_key) ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`} onClick={onCreate} disabled={loading || !form.name || !form.pix_key}>Continuar</button>
          <button className="px-4 py-2 rounded-xl font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setStep('list')}>Cancelar</button>
        </div>
      </div>
    </div>
  )

  async function finalizeSave() {
    try {
      setLoading(true)
      setError(null)
      const uidFromAuth = (window as any)?.authService?.getCurrentUser?.()?.id
      const uidFromStorage = Number(localStorage.getItem('omi_user_id') || '')
      let userId = Number.isFinite(uidFromAuth) ? Number(uidFromAuth) : (Number.isFinite(uidFromStorage) ? uidFromStorage : undefined)
      if (!userId) {
        const token = (window as any)?.authService?.getToken?.() || localStorage.getItem('omi_token') || ''
        if (token.includes('.')) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const subId = Number(payload?.userId || payload?.sub)
            if (Number.isFinite(subId)) userId = subId
          } catch {}
        }
      }
      if (!userId) throw new Error('ID do usuário não encontrado. Faça login novamente.')
      if (!pending) throw new Error('Nenhum favorecido para salvar.')
      const created = await createBeneficiary({
        name: pending.name,
        bank_name: pending.bank_name || '',
        document: pending.document || '',
        pix_key: pending.pix_key,
        key_type: pending.key_type || 'chave',
      } as any, userId)
      setPending(created)
      setStep('done')
    } catch (e: any) {
      setError(e.message || 'Falha ao salvar favorecido.')
    } finally {
      setLoading(false)
    }
  }

  const ConfirmView = (
    <div className="space-y-4 max-w-2xl">
      <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-sm">Revise os dados do favorecido e avance para senha.</div>
      {Stepper}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Confirmar dados</h2>
        {pending && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Nome</label>
              <div className="mt-1 p-3 border rounded-xl bg-slate-50">{pending.name}</div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Banco</label>
              <div className="mt-1 p-3 border rounded-xl bg-slate-50">{pending.bank_name || '-'}</div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Documento</label>
              <div className="mt-1 p-3 border rounded-xl bg-slate-50">{maskDocument(pending.document)}</div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Chave PIX</label>
              <div className="mt-1 p-3 border rounded-xl bg-slate-50 font-mono break-all">{pending.pix_key}</div>
            </div>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={finalizeSave}>Confirmar e salvar</button>
          <button className="px-3 py-2 border rounded" onClick={() => { setPending(null); setStep('create') }}>Voltar</button>
        </div>
      </div>
    </div>
  )


  const DoneView = (
    <div className="space-y-4 max-w-2xl">
      {Stepper}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold">Favorecido salvo com sucesso</h2>
        <p className="text-slate-600">Você pode enviar Pix ou voltar para a lista.</p>
        <div className="mt-6 flex gap-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setStep('list'); setPending(null); refresh() }}>Ver lista</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4">
      {step === 'list' && ListView}
      {step === 'create' && CreateView}
      {step === 'confirm' && ConfirmView}
      {step === 'done' && DoneView}
    </div>
  )
}
