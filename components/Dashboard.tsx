
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownLeft, ShieldAlert, Loader2, QrCode, Landmark, CalendarDays, Building2, Undo2, Star, Search, Receipt, BarChart2, Users, ShieldCheck, Bitcoin, ClipboardList } from 'lucide-react';
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
            {/* Resumo Financeiro */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Resumo Financeiro</h2>
                <div className="flex gap-2">
                    <button onClick={() => onNavigate('refresh')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">Atualizar</button>
                    <button onClick={() => onNavigate('hide-summary')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">Ocultar</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-50 rounded-xl"><ArrowDownLeft className="w-5 h-5 text-emerald-600" /></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Entrada (meta)</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income)}</h2>
                    <p className="text-xs text-slate-400 mt-2">Saldo mês</p>
                </div>

                <div className="bg-[#0F172A] rounded-2xl p-6 text-white shadow-sm relative overflow-hidden group border border-slate-900/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/10 rounded-xl"><Wallet className="w-5 h-5 text-indigo-300" /></div>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saldo Disponível</span>
                        </div>
                        <h2 className="text-3xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</h2>
                        <p className="text-xs text-slate-300 mt-1">Para usar</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-50 rounded-xl"><ArrowUpRight className="w-5 h-5 text-rose-600" /></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saídas (meta)</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expenses)}</h2>
                    <p className="text-xs text-slate-400 mt-2">Saldo mês</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-xl"><ShieldAlert className="w-5 h-5 text-slate-600" /></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saldo Bloqueado</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0)}</h2>
                    <p className="text-xs text-slate-400 mt-2">Bloqueado</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-xl"><ShieldAlert className="w-5 h-5 text-slate-600" /></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Saldo Garantia</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0)}</h2>
                    <p className="text-xs text-slate-400 mt-2">Reservado</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-50 rounded-xl"><ArrowDownLeft className="w-5 h-5 text-slate-600" /></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Número de transações</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{transactions.length}</h2>
                    <p className="text-xs text-slate-400 mt-2">Total no sistema</p>
                </div>
            </div>

            {/* Acessos Rápidos */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-bold text-slate-900">Acessos Rápidos</h4>
                        <p className="text-xs text-slate-400">Funcionalidades mais utilizadas</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onNavigate('refresh')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">Atualizar</button>
                        <button onClick={() => onNavigate('hide-quick-actions')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">Ocultar</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[ 
                        {key:'pix', label:'Enviar Pix', icon: QrCode},
                        {key:'withdraw', label:'Receber Pix', icon: QrCode},
                        {key:'pix-copy-paste', label:'Pix Copia e Cola', icon: ClipboardList},
                        {key:'pix-refund', label:'Estornar Pix', icon: Undo2},
                        {key:'pix-favorites', label:'Pix Favorecido', icon: Star},
                        {key:'search-transactions', label:'Buscar Transações', icon: Search},
                        {key:'transactions', label:'Extrato Detalhado', icon: Receipt},
                        {key:'transactions-consolidated', label:'Extrato Consolidado', icon: BarChart2},
                        {key:'favorites', label:'Favorecidos', icon: Users},
                        {key:'authorizations', label:'Autorizações', icon: ShieldCheck},
                        {key:'crypto', label:'Converter Criptomoedas', icon: Bitcoin},
                    ].map((a) => (
                        <button key={a.key} onClick={() => onNavigate(a.key)} className="p-4 bg-white rounded-xl border border-slate-200 text-center hover:bg-slate-50 transition-colors">
                            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                {a.icon && <a.icon className="w-5 h-5 text-slate-500" />}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{a.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
