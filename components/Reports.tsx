import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Calendar, Download, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { authService } from '../services/authService';
import { Transaction } from '../types';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10B981',
  PAID: '#10B981',
  FAILED: '#F43F5E',
  CANCELED: '#F43F5E',
  PENDING: '#F59E0B',
  PROCESSING: '#F59E0B',
};

const Reports: React.FC = () => {
  const [period, setPeriod] = useState<'today'|'7days'|'30days'|'month'|'custom'>('month');
  const [type, setType] = useState<'Todos'|'Entrada'|'Saida'>('Todos');
  const [status, setStatus] = useState<'Todos'|'Aprovado'|'Pendente'|'Falhou'>('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Transaction[]>([]);

  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await authService.getWalletLedger();
      setLedger(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Falha ao carregar dados de relatório.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, []);

  const handleApply = async () => {
    // For now, apply just re-filters locally; if server supports query params, wire here
    // Keeping UX feedback by toggling loading briefly
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 200);
  };

  const handleUpdate = async () => {
    await fetchLedger();
  };

  const handleExportCSV = () => {
    const headers = ['Data','Hora','ID','Tipo','Status','Valor','Origem','Destino'];
    const rows = filtered.map(tx => [
      new Date(tx.date).toLocaleDateString('pt-BR'),
      new Date(tx.date).toLocaleTimeString('pt-BR'),
      tx.id,
      (tx.type==='CREDIT'||tx.amount>0)?'Entrada':'Saída',
      String(tx.status),
      Math.abs(tx.amount).toFixed(2).replace('.', ','),
      tx.sender || '-',
      tx.recipient || '-',
    ]);
    const csv = [headers.join(';'), ...rows.map(r=>r.join(';'))].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorios_omini_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply filters
  const filtered = useMemo(() => {
    let list = ledger.slice();
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (period === 'today') {
      start = new Date(now); start.setHours(0,0,0,0);
      end = new Date(now); end.setHours(23,59,59,999);
    } else if (period === '7days') {
      start = new Date(now); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
      end = new Date(now); end.setHours(23,59,59,999);
    } else if (period === '30days') {
      start = new Date(now); start.setDate(start.getDate()-29); start.setHours(0,0,0,0);
      end = new Date(now); end.setHours(23,59,59,999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59, 999);
    } else if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate + 'T00:00:00');
      end = new Date(endDate + 'T23:59:59');
    }
    if (start && end) {
      list = list.filter(t => { const d = new Date(t.date); return d >= start! && d <= end!; });
    }
    if (type !== 'Todos') {
      list = list.filter(t => type === 'Entrada' ? (t.type === 'CREDIT' || t.amount > 0) : (t.type === 'DEBIT' || t.amount < 0));
    }
    if (status !== 'Todos') {
      const want = status === 'Aprovado' ? ['PAID','COMPLETED'] : status === 'Pendente' ? ['PENDING','PROCESSING'] : ['FAILED','CANCELED'];
      list = list.filter(t => want.includes(String(t.status).toUpperCase()));
    }
    return list;
  }, [ledger, period, type, status, startDate, endDate]);

  // Metrics
  const metrics = useMemo(() => {
    const totalVolume = filtered.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const totalCount = filtered.length;
    const entryCount = filtered.filter(t => t.type === 'CREDIT' || t.amount > 0).length;
    const ticketMedio = totalCount > 0 ? totalVolume / totalCount : 0;
    // Conversão de cobranças: paid/completed over total (if cobranca-like). Using status as proxy.
    const approved = filtered.filter(t => ['PAID','COMPLETED'].includes(String(t.status).toUpperCase())).length;
    const conversion = totalCount > 0 ? (approved / totalCount) * 100 : 0;
    // Taxa de reembolso: refunded over total
    const refunded = filtered.filter(t => String(t.status).toUpperCase() === 'REFUNDED').length;
    const refundRate = totalCount > 0 ? (refunded / totalCount) * 100 : 0;
    return { totalVolume, totalCount, entryCount, ticketMedio, conversion, refundRate };
  }, [filtered]);

  // Chart: Volume by day
  const volumeData = useMemo(() => {
    const map: { key: string; label: string; ts: number; total: number }[] = [];
    const idx: Record<string, number> = {};
    filtered.forEach(t => {
      const d = new Date(t.date);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
      if (idx[dayKey] == null) { idx[dayKey] = map.length; map.push({ key: dayKey, label, ts: new Date(dayKey).getTime(), total: 0 }); }
      map[idx[dayKey]].total += Math.abs(t.amount);
    });
    // Sort ascending by timestamp so the earliest date is left
    return map.sort((a,b)=>a.ts-b.ts).map(m => ({ date: m.label, value: m.total }));
  }, [filtered]);

  // Chart: Status distribution
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { const s = String(t.status).toUpperCase(); map[s] = (map[s] || 0) + 1; });
    const entries = Object.entries(map).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#64748B' }));
    // Group into desired labels
    const grouped = [
      { name: 'Completado', value: (map['PAID']||0) + (map['COMPLETED']||0), color: '#10B981' },
      { name: 'Cancelado', value: (map['FAILED']||0) + (map['CANCELED']||0), color: '#F43F5E' },
      { name: 'Pendente', value: (map['PENDING']||0) + (map['PROCESSING']||0), color: '#F59E0B' },
    ];
    return grouped;
  }, [filtered]);

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col w-full max-w-none">
      <div className="p-6 lg:p-8 border-b border-slate-100 space-y-6">
        <div className="flex items-center gap-2 text-slate-700 font-bold"><Filter className="w-4 h-4" /> Filtros Avançados</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 font-bold">Período</label>
            <select value={period} onChange={e=>setPeriod(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option value="month">Este Mês</option>
              <option value="30days">30 dias</option>
              <option value="7days">7 dias</option>
              <option value="today">Hoje</option>
              <option value="custom">Personalizar</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-bold">Tipo</label>
            <select value={type} onChange={e=>setType(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option>Todos</option>
              <option>Entrada</option>
              <option>Saida</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-bold">Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
              <option>Todos</option>
              <option>Aprovado</option>
              <option>Pendente</option>
              <option>Falhou</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleExportCSV} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Download className="w-4 h-4" /> Exportar</button>
            <button onClick={handleApply} className="px-4 py-2 bg-[#0F172A] text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Filter className="w-4 h-4" /> Aplicar</button>
          </div>
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-bold">Data Início</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold">Data Final</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleExportCSV} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Download className="w-4 h-4" /> Exportar</button>
              <button onClick={handleUpdate} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar</button>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 lg:p-8 space-y-8">
        {error && (<div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm">{error}</div>)}
        {/* Resumo Financeiro */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Conversão de Cobranças</p>
              <p className="text-2xl font-bold text-emerald-600">{metrics.conversion.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Ticket Médio</p>
              <p className="text-2xl font-bold text-indigo-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.ticketMedio)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Taxa de Reembolso</p>
              <p className="text-2xl font-bold text-rose-600">{metrics.refundRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Volume de Transações</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B'}} tickFormatter={(v)=>`R$ ${Number(v).toLocaleString('pt-BR')}`} />
                  <Tooltip contentStyle={{backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#fff'}} formatter={(val)=>[`R$ ${Number(val as number).toLocaleString('pt-BR')}`, 'Volume (R$)']} />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Volume (R$)" stroke="#1F2A56" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeOpacity={0.9} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Status das Transações</h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={1}
                    dataKey="value"
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
