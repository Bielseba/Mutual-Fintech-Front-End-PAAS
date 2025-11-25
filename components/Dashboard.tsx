
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, QrCode, Link as LinkIcon, Download, Share2, Wallet, TrendingUp, Activity, Users, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';
import { ViewState } from '../types';

const data = [
  { name: '00h', sales: 4000 },
  { name: '04h', sales: 3000 },
  { name: '08h', sales: 2000 },
  { name: '12h', sales: 2780 },
  { name: '16h', sales: 1890 },
  { name: '20h', sales: 2390 },
  { name: '23h', sales: 3490 },
];

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
        try {
            const user = authService.getUser();
            if (user && user.id) {
                const bal = await authService.getWalletBalance(user.id);
                setBalance(bal);
            }
        } catch (error) {
            console.error("Failed to load balance", error);
        } finally {
            setIsLoadingBalance(false);
        }
    };
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
        const user = authService.getUser();
        if (user && user.id) {
            const bal = await authService.getWalletBalance(user.id);
            setBalance(bal);
        }
    } catch (error) {
        console.error("Failed to load balance", error);
    } finally {
        setIsLoadingBalance(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Balance / TPV Card - MUTUAL NAVY BG */}
        <div className="bg-[#0F172A] rounded-2xl p-5 lg:p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20"></div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            Saldo Disponível
                            <button onClick={() => setShowBalance(!showBalance)} className="text-slate-500 hover:text-white transition-colors">
                                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={fetchBalance} className="text-slate-500 hover:text-amber-400 transition-colors ml-1" title="Atualizar saldo">
                                <Activity className="w-3.5 h-3.5" />
                            </button>
                        </p>
                        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
                            {isLoadingBalance ? (
                                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                            ) : (
                                showBalance ? formatCurrency(balance) : 'R$ •••••••'
                            )}
                        </h2>
                    </div>
                    <div className="bg-amber-500/20 p-2 rounded-lg backdrop-blur-sm">
                        <Wallet className="w-5 h-5 text-amber-400" />
                    </div>
                </div>

                <div className="mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <span>A liberar:</span>
                        <span className="text-white font-semibold">R$ 0,00</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-1.5 rounded-full w-[0%]"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Sales Today */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Vendas Hoje</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ 0,00</h3>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    0%
                </span>
                <span className="text-xs text-slate-400">vs. ontem</span>
            </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Conversão Pix</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">0%</h3>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-600" />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-slate-500">
                           <Users className="w-3 h-3" />
                        </div>
                    ))}
                </div>
                <span className="text-xs text-slate-400">0 pagamentos aprovados</span>
            </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-5 lg:p-8 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Volume Transacional</h3>
                    <p className="text-sm text-slate-500">Acompanhamento de vendas em tempo real</p>
                </div>
                <select className="bg-slate-50 border-none text-slate-600 text-sm font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full sm:w-auto">
                    <option>Hoje</option>
                    <option>7 Dias</option>
                    <option>30 Dias</option>
                </select>
             </div>
             
             <div className="h-[250px] lg:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} 
                        dy={10} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          padding: '12px'
                      }}
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Quick Actions & System Status */}
          <div className="space-y-6">
              <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => onNavigate('pix')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-colors group border border-transparent hover:border-amber-100"
                      >
                          <QrCode className="w-6 h-6 mb-2 text-slate-600 group-hover:text-amber-600" />
                          <span className="text-xs font-semibold text-slate-600 group-hover:text-amber-700">Novo Pix</span>
                      </button>
                      <button 
                        onClick={() => onNavigate('withdraw')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group border border-transparent hover:border-emerald-100"
                      >
                          <ArrowDownLeft className="w-6 h-6 mb-2 text-slate-600 group-hover:text-emerald-600" />
                          <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-700">Sacar</span>
                      </button>
                      <button 
                        onClick={() => onNavigate('transactions')}
                        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition-colors group border border-transparent hover:border-purple-100 col-span-2"
                      >
                          <Share2 className="w-6 h-6 mb-2 text-slate-600 group-hover:text-purple-600" />
                          <span className="text-xs font-semibold text-slate-600 group-hover:text-purple-700">Relatório</span>
                      </button>
                  </div>
              </div>

              <div className="bg-slate-900 p-5 lg:p-6 rounded-2xl shadow-lg text-white">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      Status do Sistema
                  </h3>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">API Pix</span>
                          <span className="text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded text-xs">Operacional</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Webhooks</span>
                          <span className="text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded text-xs">Operacional</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Conciliação</span>
                          <span className="text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded text-xs">Lentidão</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
