
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Wallet, Activity, ArrowRight, TrendingUp, DollarSign, Calendar, MoreHorizontal, CreditCard, Lock, ShieldAlert } from 'lucide-react';
import { authService } from '../services/authService';
import { ViewState, Transaction } from '../types';

const data = [
  { name: 'Seg', sales: 1200 }, { name: 'Ter', sales: 2100 }, { name: 'Qua', sales: 800 },
  { name: 'Qui', sales: 1600 }, { name: 'Sex', sales: 900 }, { name: 'Sab', sales: 1700 }, { name: 'Dom', sales: 2400 },
];

interface DashboardProps { onNavigate: (view: ViewState) => void; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-white text-base font-bold">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [blockedBalance, setBlockedBalance] = useState<number>(1250.00); // Mocked for UI, ideally comes from API
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const user = authService.getUser();
            if (user && user.id) {
                const [bal, ledger] = await Promise.all([
                    authService.getWalletBalance(user.id),
                    authService.getWalletLedger(user.id)
                ]);
                setBalance(bal);
                setRecentTransactions(ledger.slice(0, 5));
            }
        } catch (error) { console.error("Failed to load dashboard data", error); } 
        finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-8">
      {/* 1. Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Balance Card (Black Card Aesthetic) */}
        <div className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative h-full bg-[#0F172A] rounded-[2rem] p-8 text-white overflow-hidden flex flex-col justify-between border border-white/5 shadow-2xl">
                {/* Mesh Gradient */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-600/20 to-transparent rounded-full blur-[80px] -mr-20 -mt-20"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <Wallet className="w-6 h-6 text-indigo-400" />
                        </div>
                        <button onClick={() => setShowBalance(!showBalance)} className="text-slate-400 hover:text-white transition-colors">
                            {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    <div className="space-y-1 mb-8">
                        <p className="text-slate-400 text-sm font-medium tracking-wide">Saldo Disponível</p>
                        <h2 className="text-5xl font-bold text-white tracking-tight">
                            {isLoading ? <div className="h-12 w-48 bg-white/10 rounded animate-pulse"/> : showBalance ? formatCurrency(balance) : '•••••••'}
                        </h2>
                    </div>

                    {/* BLOCKED BALANCE SECTION */}
                    <div className="mb-8 pt-4 border-t border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors" onClick={() => onNavigate('med')}>
                        <div className="flex items-center gap-2">
                             <ShieldAlert className="w-4 h-4 text-amber-500" />
                             <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Saldo Bloqueado (MED)</span>
                        </div>
                        <span className="text-amber-400 font-mono font-bold text-sm flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {showBalance ? formatCurrency(blockedBalance) : '••••'}
                        </span>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-4">
                    <button onClick={() => onNavigate('pix')} className="bg-white text-slate-950 text-sm font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]">
                        <ArrowDownLeft className="w-4 h-4" /> Depositar
                    </button>
                    <button onClick={() => onNavigate('withdraw')} className="bg-white/10 text-white text-sm font-bold py-4 rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm border border-white/5 active:scale-[0.98]">
                        <ArrowUpRight className="w-4 h-4" /> Sacar
                    </button>
                </div>
            </div>
        </div>

        {/* Charts & Metrics */}
        <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Entradas</p>
                        <h3 className="text-2xl font-bold text-slate-900">R$ 12.450,00</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Volume Total</p>
                        <h3 className="text-2xl font-bold text-slate-900">R$ 16.650,00</h3>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex-1 min-h-[250px] relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Fluxo Financeiro</h3>
                        <p className="text-sm text-slate-500">Análise de 7 dias</p>
                    </div>
                    <select className="bg-slate-50 border-none text-xs font-bold text-slate-600 rounded-lg py-2 px-3 outline-none cursor-pointer">
                        <option>Esta Semana</option>
                        <option>Este Mês</option>
                    </select>
                </div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorOmini" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOmini)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

      {/* 2. Recent Transactions Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Últimas Transações</h3>
                <p className="text-sm text-slate-500">Monitoramento em tempo real</p>
              </div>
              <button onClick={() => onNavigate('transactions')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                  Ver extrato <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
          
          <div className="overflow-x-auto">
            {recentTransactions.length === 0 ? (
                <div className="p-16 text-center text-slate-400">Nenhuma movimentação recente.</div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-8 py-4">Descrição</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-8 py-4 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recentTransactions.map((tx, idx) => {
                            const isCredit = tx.type === 'CREDIT' || tx.type === 'PIX_IN' || tx.amount > 0;
                            return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{tx.description || 'Pix Transfer'}</p>
                                                <span className="text-[10px] text-slate-400 font-mono">ID: {tx.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                                        {new Date(tx.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {tx.status === 'COMPLETED' ? 'Aprovado' : tx.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`font-bold text-sm ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                                            {isCredit ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
          </div>
      </div>
    </div>
  );
};
