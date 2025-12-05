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

  const [step, setStep] = useState<'list' | 'create' | 'confirm' | 'pin' | 'done'>('list')
  const [form, setForm] = useState({ name: '', bank_name: '', document: '', pix_key: '', key_type: 'chave' })
  const [pending, setPending] = useState<Beneficiary | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await listBeneficiaries()
      setItems(data)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar favorecidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function onCreate() {
    setLoading(true)
    setError(null)
    try {
      const created = await createBeneficiary(form)
      setPending(created)
      setStep('confirm')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function onRemove(id: number) {
    setLoading(true)
    try {
      await removeBeneficiary(id)
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

  const Stepper = (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
      <div className="flex items-center justify-between">
        {[{k:'list',t:'Digitar'},{k:'confirm',t:'Confirmar'},{k:'pin',t:'Senha'},{k:'done',t:'Finalização'}].map((s, idx) => (
          <div key={s.k} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step===s.k?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500'}`}>{idx+1}</div>
            <span className="text-sm text-slate-600">{s.t}</span>
          </div>
        ))}
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
            <div key={b.id} className="border border-slate-200 rounded-xl p-3 hover:bg-slate-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{shortName(b.name)}</div>
                  <div className="text-xs text-slate-500">{b.bank_name || '-'}</div>
                  <div className="mt-1 flex gap-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">{(b.document||'').length>11?'CNPJ':'CPF'}</span>
                    <span className="text-xs text-slate-600">{maskDocument(b.document)}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    Chave: <span className="font-mono">{b.pix_key.length > 22 ? b.pix_key.slice(0, 22) + '…' : b.pix_key}</span>
                    <button className="ml-2" onClick={() => navigator.clipboard.writeText(b.pix_key)} title="Copiar">
                      <ClipboardCopy size={16}/>
                    </button>
                  </div>
                </div>
                <button className="text-red-600" onClick={() => onRemove(b.id)} title="Remover">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div className="text-slate-500 text-sm">Nenhum favorecido encontrado.</div>}
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

  const ConfirmView = (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">Confirmar dados</h2>
      {pending && (
        <div className="border rounded p-3 space-y-2">
          <div><b>Nome:</b> {pending.name}</div>
          <div><b>Documento:</b> {maskDocument(pending.document)}</div>
          <div><b>Banco:</b> {pending.bank_name || '-'}</div>
          <div><b>Chave:</b> <span className="font-mono">{pending.pix_key}</span></div>
        </div>
      )}
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={() => setStep('pin')}>Confirmar</button>
        <button className="px-3 py-2 border rounded" onClick={() => { setPending(null); setStep('create') }}>Voltar</button>
      </div>
    </div>
  )

  const PinView = (
    <div className="space-y-4 max-w-sm">
      <h2 className="text-lg font-semibold">Digite sua senha</h2>
      <input type="password" className="border p-2 rounded w-full" placeholder="Senha" onKeyDown={e => { if (e.key === 'Enter') setStep('done') }} />
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setStep('done')}>Finalizar</button>
        <button className="px-3 py-2 border rounded" onClick={() => setStep('confirm')}>Voltar</button>
      </div>
    </div>
  )

  const DoneView = (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Favorecido salvo com sucesso</h2>
      <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setStep('list'); setPending(null); refresh() }}>Ver lista</button>
    </div>
  )

  return (
    <div className="p-4">
      {step === 'list' && ListView}
      {step === 'create' && CreateView}
      {step === 'confirm' && ConfirmView}
      {step === 'pin' && PinView}
      {step === 'done' && DoneView}
    </div>
  )
}
