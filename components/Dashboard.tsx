
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownLeft, ShieldAlert, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { Transaction, MedSummary } from '../types';

// Helper for cleaning description (duplicated from TransactionHistory for isolation)
const cleanDescription = (desc: string, type: string, amount: number) => {
    if (!desc) return amount > 0 ? 'Depósito Pix' : 'Transferência Pix';
    if (desc.trim().startsWith('{') || desc.trim().startsWith('[')) {
        try {
            const obj = JSON.parse(desc);
            if (obj.description) return obj.description;
            if (obj.reason) return obj.reason;
            if (obj.type === 'PIX') return amount > 0 ? 'Recebimento Pix' : 'Envio Pix';
        } catch (e) {}
    }
    const lower = desc.toLowerCase();
    if (lower.includes('starpago') || lower.includes('merorderno') || lower.includes('wd-')) return 'Saque Pix';
    if (lower.includes('pix sent') || lower.includes('envio pix')) return 'Envio Pix';
    if (lower.includes('pix received') || lower.includes('recebimento pix')) return 'Recebimento Pix';
    if (lower.includes('depósito') || lower.includes('deposit')) return 'Depósito Pix';
    if (lower.includes('withdraw') || lower.includes('saque')) return 'Saque Pix';
    if (desc === 'Transação' || desc === 'Wallet Transfer' || desc.length > 50) return amount > 0 ? 'Depósito Pix' : 'Saque Pix';
    return desc;
};

export const Dashboard: React.FC<{ onNavigate: (view: any) => void }> = ({ onNavigate }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [medSummary, setMedSummary] = useState<MedSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = authService.getUser();
        if (user?.id) {
            const [bal, ledger, med] = await Promise.all([
                authService.getWalletBalance(user.id),
                authService.getWalletLedger(),
                adminService.getMedSummary()
            ]);
            setBalance(bal);
            setTransactions(ledger);
            setMedSummary(med);
        }
      } catch (error) {
        console.error("Dashboard load error", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate Chart Data (Last 7 days)
  const chartData = React.useMemo(() => {
    const data: any[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        // Find txs for this day
        const dayTxs = transactions.filter(t => new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) === dateStr);
        const dayBalance = dayTxs.reduce((acc, t) => acc + (t.amount), 0);
        data.push({ name: dateStr, value: Math.abs(dayBalance) });
    }
    return data;
  }, [transactions]);

  // Calculate totals
  const income = transactions.filter(t => t.type === 'CREDIT' || (t.type !== 'DEBIT' && t.amount > 0)).reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'DEBIT' || (t.type !== 'CREDIT' && t.amount < 0)).reduce((acc, t) => acc + Math.abs(t.amount), 0);

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0F172A] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-indigo-500/30"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/10 rounded-xl"><Wallet className="w-5 h-5 text-indigo-300" /></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saldo Disponível</span>
                </div>
                <h2 className="text-3xl font-bold mb-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</h2>
                <div className="flex items-center gap-2 mt-4">
                    <button onClick={() => onNavigate('pix')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors">Depositar</button>
                    <button onClick={() => onNavigate('withdraw')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Sacar</button>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 rounded-xl"><ArrowDownLeft className="w-5 h-5 text-emerald-600" /></div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Entradas (30d)</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income)}</h2>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-emerald-500 w-[70%]"></div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-50 rounded-xl"><ArrowUpRight className="w-5 h-5 text-rose-600" /></div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saídas (30d)</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expenses)}</h2>
             <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-rose-500 w-[30%]"></div>
            </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-900">Movimentação da Semana</h3>
                  <button className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">Ver Relatório</button>
              </div>
              <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `R$${v}`} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px'}}
                            cursor={{stroke: '#6366f1', strokeWidth: 1}}
                        />
                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-900 mb-6">Status do Sistema</h3>
              
              <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-slate-700">API Gateway</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">Online</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-700">Pix BACEN</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">Online</span>
                  </div>
                  
                  {medSummary && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-bold text-amber-700 uppercase">Alertas MED</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-800">{medSummary.openCount}</p>
                        <p className="text-xs text-amber-600">Disputas em aberto requerem atenção.</p>
                        <button onClick={() => onNavigate('med')} className="mt-3 w-full py-2 bg-white text-amber-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
                            Gerenciar Disputas
                        </button>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Últimas Transações</h3>
              <button onClick={() => onNavigate('transactions')} className="text-xs font-bold text-indigo-600 hover:underline">Ver tudo</button>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <tbody className="divide-y divide-slate-50">
                      {transactions.slice(0, 5).map((tx) => {
                          const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
                          return (
                              <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                              {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                          </div>
                                          <div>
                                              <p className="font-bold text-slate-900">{cleanDescription(tx.description, tx.type, tx.amount)}</p>
                                              <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td className={`px-6 py-4 text-right font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isCredit ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(tx.amount))}
                                  </td>
                              </tr>
                          );
                      })}
                      {transactions.length === 0 && (
                          <tr><td colSpan={2} className="p-8 text-center text-slate-400">Nenhuma transação recente.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
