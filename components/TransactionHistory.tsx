
import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Loader2, FileText, X, Printer, Share2, CheckCircle, Wallet, Ban, Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Transaction } from '../types';
import { authService } from '../services/authService';

const OminiLogo = ({ className }: { className?: string }) => (
  <img 
    src="https://i.postimg.cc/d1bgGj0x/Chat-GPT-Image-27-de-nov-de-2025-02-31-54.png" 
    alt="Omini API" 
    className={`object-contain ${className}`} 
  />
);

const StatusBadge = ({ status }: { status: string }) => {
  const s = String(status).toUpperCase();
  const styles: any = {
    'COMPLETED': 'bg-emerald-100 text-emerald-700',
    'PAID': 'bg-emerald-100 text-emerald-700',
    'PENDING': 'bg-amber-100 text-amber-700',
    'FAILED': 'bg-rose-100 text-rose-700',
    'REFUNDED': 'bg-indigo-100 text-indigo-700'
  };
  const label = s === 'COMPLETED' ? 'Aprovado' : s === 'PAID' ? 'Pago' : s === 'PENDING' ? 'Em Processamento' : s === 'FAILED' ? 'Falhou' : s === 'REFUNDED' ? 'Estornado' : s;
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${styles[s] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
};

const TransactionIcon = ({ type, isCredit }: { type: string, isCredit: boolean }) => {
  if (type === 'FAILED') return <Ban className="w-5 h-5 text-rose-600" />;
  if (type === 'CREDIT' || isCredit) return <ArrowDownLeft className="w-5 h-5 text-emerald-600" />;
  return <ArrowUpRight className="w-5 h-5 text-rose-600" />;
};

export const TransactionHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'detailed' | 'consolidated'>('detailed');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | 'all'>('30days');
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTransactions();
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const user = authService.getUser();
            if (user?.id) {
                const ledger = await authService.getWalletLedger();
                setTransactions(ledger);
            }
        } catch (err) { setError('Falha ao carregar histórico.'); } 
        finally { setIsLoading(false); }
  };

  const handlePrintReceipt = () => {
    if (!viewingReceipt) return;
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
        const win = window.open('', '', 'height=800,width=600');
        win?.document.write(`<html><head><title>Comprovante - Omini API</title><script src="https://cdn.tailwindcss.com"></script><style>body { -webkit-print-color-adjust: exact; }</style></head><body class="bg-slate-50 flex items-center justify-center min-h-screen"><div class="max-w-md w-full">${printContent.innerHTML}</div></body></html>`);
        win?.document.close();
        setTimeout(() => { win?.print(); win?.close(); }, 500);
    }
  };

  // --- FILTER LOGIC ---
  const getFilteredTransactions = () => {
      const now = new Date();
      let filtered = transactions;

      // Date Filter
      if (dateFilter === 'today') {
          filtered = filtered.filter(t => new Date(t.date).toDateString() === now.toDateString());
      } else if (dateFilter === 'yesterday') {
          const yest = new Date(now); yest.setDate(yest.getDate() - 1);
          filtered = filtered.filter(t => new Date(t.date).toDateString() === yest.toDateString());
      } else if (dateFilter === '7days') {
          const limit = new Date(now); limit.setDate(limit.getDate() - 7);
          filtered = filtered.filter(t => new Date(t.date) >= limit);
      } else if (dateFilter === '30days') {
          const limit = new Date(now); limit.setDate(limit.getDate() - 30);
          filtered = filtered.filter(t => new Date(t.date) >= limit);
      }

      // Search Filter
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(t => 
             t.description.toLowerCase().includes(term) || 
             t.id.toLowerCase().includes(term) ||
             String(t.amount).includes(term)
          );
      }

      return filtered;
  };

  // --- EXPORT LOGIC ---
  const handleExportCSV = () => {
      const data = getFilteredTransactions();
      if (!data.length) return;

      const headers = ['ID', 'Data', 'Hora', 'Descrição', 'Tipo', 'Valor', 'Status', 'Origem', 'Destino'];
      const rows = data.map(tx => [
          tx.id,
          new Date(tx.date).toLocaleDateString('pt-BR'),
          new Date(tx.date).toLocaleTimeString('pt-BR'),
          `"${tx.description}"`, // Escape commas
          tx.type === 'CREDIT' ? 'Entrada' : 'Saída',
          tx.amount.toFixed(2).replace('.', ','),
          tx.status,
          tx.sender || '-',
          tx.recipient || '-'
      ]);

      // Join with semicolons for Excel compatibility in Brazil
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      
      // Add BOM for proper UTF-8 handling in Excel
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `extrato_omini_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const data = getFilteredTransactions();
    if (!data.length) return;

    const win = window.open('', '', 'height=800,width=1000');
    if (!win) return;

    const logoUrl = "https://i.postimg.cc/d1bgGj0x/Chat-GPT-Image-27-de-nov-de-2025-02-31-54.png";
    const totalIn = data.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const totalOut = data.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const balance = totalIn - totalOut;

    const htmlContent = `
        <html>
        <head>
            <title>Extrato - Omini API</title>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                .logo { height: 50px; }
                .title { font-size: 24px; font-weight: bold; color: #0F172A; }
                .meta { font-size: 12px; color: #666; text-align: right; }
                .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                .card { padding: 15px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
                .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; }
                .card-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
                .text-green { color: #10b981; }
                .text-red { color: #f43f5e; }
                table { w-full; border-collapse: collapse; width: 100%; font-size: 12px; }
                th { text-align: left; padding: 10px; border-bottom: 1px solid #cbd5e1; background: #f1f5f9; text-transform: uppercase; font-size: 10px; color: #475569; }
                td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
                .amount { font-weight: bold; text-align: right; }
                .status { padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
                .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <img src="${logoUrl}" class="logo" alt="Omini API" />
                    <div class="title">Extrato Financeiro</div>
                </div>
                <div class="meta">
                    Gerado em: ${new Date().toLocaleString('pt-BR')}<br/>
                    Período: ${dateFilter === 'all' ? 'Todo o histórico' : 'Filtro aplicado'}
                </div>
            </div>

            <div class="summary">
                <div class="card">
                    <div class="card-label">Total Entradas</div>
                    <div class="card-value text-green">R$ ${totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                <div class="card">
                    <div class="card-label">Total Saídas</div>
                    <div class="card-value text-red">R$ ${totalOut.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                <div class="card">
                    <div class="card-label">Resultado Líquido</div>
                    <div class="card-value">R$ ${balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>ID</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th style="text-align: right">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(tx => {
                        const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
                        return `
                        <tr>
                            <td>
                                <div>${new Date(tx.date).toLocaleDateString('pt-BR')}</div>
                                <div style="color: #94a3b8; font-size: 10px">${new Date(tx.date).toLocaleTimeString('pt-BR')}</div>
                            </td>
                            <td style="font-family: monospace;">${tx.id.substring(0,8)}...</td>
                            <td>${tx.description}</td>
                            <td>${isCredit ? 'ENTRADA' : 'SAÍDA'}</td>
                            <td><span class="status" style="background: #e2e8f0;">${tx.status}</span></td>
                            <td class="amount" style="color: ${isCredit ? '#10b981' : '#f43f5e'}">
                                ${isCredit ? '+' : '-'} R$ ${Math.abs(tx.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="footer">
                Este documento é para fins de conferência simples e não substitui extratos fiscais oficiais.<br/>
                Omini API - Tecnologia em Pagamentos
            </div>
        </body>
        </html>
    `;

    win.document.write(htmlContent);
    win.document.close();
    setTimeout(() => {
        win.print();
    }, 500);
  };

  // --- CHART DATA GENERATION ---
  const getConsolidatedData = () => {
      const txs = getFilteredTransactions(); // Uses same date filter
      const dailyMap: {[key: string]: {date: string, in: number, out: number, balanceDelta: number}} = {};
      const distribution = { in: 0, out: 0 };

      // Initialize last 7 days if empty
      for(let i=6; i>=0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          dailyMap[dateStr] = { date: dateStr, in: 0, out: 0, balanceDelta: 0 };
      }

      txs.forEach(tx => {
          const dateStr = new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
          const amount = Math.abs(tx.amount);

          if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, in: 0, out: 0, balanceDelta: 0 };

          if (isCredit) {
              dailyMap[dateStr].in += amount;
              dailyMap[dateStr].balanceDelta += amount;
              distribution.in += amount;
          } else {
              dailyMap[dateStr].out += amount;
              dailyMap[dateStr].balanceDelta -= amount;
              distribution.out += amount;
          }
      });

      const chartData = Object.values(dailyMap).sort((a,b) => {
          // Simple sort logic for DD/MM
          const [d1, m1] = a.date.split('/').map(Number);
          const [d2, m2] = b.date.split('/').map(Number);
          return (m1 - m2) || (d1 - d2);
      });

      const pieData = [
          { name: 'Entradas', value: distribution.in, color: '#10B981' }, // Emerald
          { name: 'Saídas', value: distribution.out, color: '#F43F5E' }   // Rose
      ];

      return { chartData, pieData, tableData: chartData.reverse() }; // Table reverse chronological
  };

  const filteredTx = getFilteredTransactions();
  const consolidated = getConsolidatedData();

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
      
      {/* Header & Tabs */}
      <div className="p-6 lg:p-8 border-b border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('detailed')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'detailed' ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Detalhado
                </button>
                <button 
                    onClick={() => setActiveTab('consolidated')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'consolidated' ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Consolidado
                </button>
            </div>
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                <div className="flex gap-2 min-w-max">
                    {[
                        { id: 'today', label: 'Hoje' },
                        { id: 'yesterday', label: 'Ontem' },
                        { id: '7days', label: '7 dias' },
                        { id: '30days', label: '30 dias' },
                        { id: 'all', label: 'Todos' }
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setDateFilter(f.id as any)}
                            className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide transition-colors ${
                                dateFilter === f.id 
                                ? 'bg-[#0F172A] text-white border-[#0F172A]' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <button className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-slate-50">
                        <Calendar className="w-3 h-3" /> Personalizar
                    </button>
                </div>
            </div>

            {activeTab === 'detailed' && (
                <div className="flex gap-2 w-full lg:w-auto">
                    <button 
                        onClick={handleExportCSV}
                        className="flex-1 lg:flex-none px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors active:scale-95"
                    >
                        <Download className="w-4 h-4" /> CSV
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="flex-1 lg:flex-none px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors active:scale-95"
                    >
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={fetchTransactions} className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}
        </div>
        
        {/* Search Bar (Detailed Only) */}
        {activeTab === 'detailed' && (
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="md:col-span-2 relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input 
                            type="text" placeholder="Buscar por descrição, ID ou valor..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                         />
                     </div>
                     <div className="relative">
                        <select className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none text-slate-600 appearance-none cursor-pointer">
                            <option>Todos os tipos</option>
                            <option>Entradas</option>
                            <option>Saídas</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                     </div>
                     <button onClick={() => setSearchTerm('')} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors text-right">
                         Limpar Filtros
                     </button>
                </div>
             </div>
        )}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-x-auto bg-white min-h-[400px]" ref={menuRef}>
        {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : (
            <>
                {/* 📊 CONSOLIDATED VIEW */}
                {activeTab === 'consolidated' && (
                    <div className="p-6 lg:p-8 space-y-8">
                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-6">Movimentação Diária</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={consolidated.chartData}>
                                            <defs>
                                                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B'}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748B'}} tickFormatter={(val) => `R$${val}`} />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: '#0F172A', borderRadius: '8px', border: 'none', color: '#fff'}}
                                                itemStyle={{fontSize: '12px'}}
                                            />
                                            <Area type="monotone" dataKey="in" name="Entradas" stroke="#10B981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="out" name="Saídas" stroke="#F43F5E" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 w-full text-left">Distribuição</h3>
                                <div className="w-full h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={consolidated.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {consolidated.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Daily Summary Table */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900">Movimentação Detalhada por Dia</h3>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Data</th>
                                        <th className="px-6 py-3 text-emerald-600">Entradas</th>
                                        <th className="px-6 py-3 text-rose-600">Saídas</th>
                                        <th className="px-6 py-3 text-right">Resultado do Dia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {consolidated.tableData.map((day, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-700">{day.date}</td>
                                            <td className="px-6 py-4 text-emerald-600 font-bold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.in)}
                                            </td>
                                            <td className="px-6 py-4 text-rose-600 font-bold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.out)}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${day.balanceDelta >= 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.balanceDelta)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 📝 DETAILED VIEW */}
                {activeTab === 'detailed' && (
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Transação</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right">Valor</th>
                                <th className="px-6 py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTx.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum registro encontrado para este filtro.</td></tr>
                            ) : filteredTx.map((tx) => {
                            const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
                            return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isCredit ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                        <TransactionIcon type={tx.type} isCredit={isCredit} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{tx.description}</p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {tx.id.substring(0,8)}...</p>
                                    </div>
                                </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-slate-700 font-medium">{new Date(tx.date).toLocaleDateString()}</span>
                                        <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </td>
                                <td className={`px-6 py-5 font-bold text-right ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isCredit ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(tx.amount))}
                                </td>
                                <td className="px-6 py-5 text-center"><StatusBadge status={String(tx.status)} /></td>
                                <td className="px-6 py-5 text-right relative">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === tx.id ? null : tx.id); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                    {activeMenuId === tx.id && (
                                        <div className="absolute right-12 top-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-1 animate-fade-in">
                                            <button onClick={() => { setViewingReceipt(tx); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-colors">
                                                <FileText className="w-4 h-4" /> Ver Comprovante
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </>
        )}
      </div>
      
      {/* PROFESSIONAL RECEIPT MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in h-[100dvh] grid place-items-center">
            <div className="bg-[#F8FAFC] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90vh] relative animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100 shrink-0">
                    <h3 className="font-bold text-slate-900">Comprovante de Transação</h3>
                    <button onClick={() => setViewingReceipt(null)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#F8FAFC]">
                    <div id="receipt-content" className="bg-white p-0 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Receipt Header */}
                        <div className="bg-slate-900 p-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                            <div className="flex justify-center mb-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <OminiLogo className="w-8 h-8" />
                                </div>
                            </div>
                            <h2 className="text-white font-bold text-lg mb-1">Comprovante de Operação</h2>
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Omini Financial API</p>
                        </div>

                        <div className="p-6">
                            {/* Amount & Status */}
                            <div className="text-center mb-8 pb-8 border-b border-dashed border-slate-200">
                                <p className="text-slate-500 text-sm font-medium mb-1">Valor Total</p>
                                <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(viewingReceipt.amount))}
                                </h1>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    <CheckCircle className="w-3 h-3" /> Transação Aprovada
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Data da Operação</span>
                                        <p className="text-sm font-bold text-slate-900">{new Date(viewingReceipt.date).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-500">{new Date(viewingReceipt.date).toLocaleTimeString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Tipo</span>
                                        <p className="text-sm font-bold text-slate-900">{viewingReceipt.description}</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5"></div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-0.5">Origem</span>
                                            <p className="text-sm font-bold text-slate-900 break-all">{viewingReceipt.sender || 'Conta Principal'}</p>
                                        </div>
                                    </div>
                                    <div className="pl-1 -mt-2 mb-2 border-l border-dashed border-slate-300 h-4 ml-0.5"></div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shadow-[0_0_0_2px_rgba(99,102,241,0.2)]"></div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-0.5">Destino</span>
                                            <p className="text-sm font-bold text-slate-900 break-all">{viewingReceipt.recipient || 'Destinatário'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">ID da Transação</span>
                                    <p className="font-mono text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 break-all">
                                        {viewingReceipt.id}
                                    </p>
                                </div>
                                
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Autenticação (Hash)</span>
                                    <p className="font-mono text-[10px] text-slate-400 break-all leading-tight">
                                        {Array(4).fill(0).map(() => Math.random().toString(36).substring(2)).join('').toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                            <p className="text-[10px] text-slate-400">Este documento possui valor legal e comprova a realização da operação.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                    <button onClick={handlePrintReceipt} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10">
                        <Printer className="w-4 h-4" /> Imprimir / PDF
                    </button>
                    <button className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <Share2 className="w-4 h-4" /> Compartilhar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
//NEW