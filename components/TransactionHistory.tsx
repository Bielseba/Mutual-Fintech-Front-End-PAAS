
import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Loader2, AlertCircle, FileText, X, Printer, Share2, CheckCircle } from 'lucide-react';
import { Transaction, TransactionStatus } from '../types';
import { authService } from '../services/authService';

// Recreated Logo for local usage
const MutualLogo = ({ className, color = "text-amber-500" }: { className?: string; color?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 80L40 25L50 55L60 25L80 80" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className={color} />
  </svg>
);

const StatusBadge = ({ status }: { status: string }) => {
  let normalizedStatus = String(status).toUpperCase();
  
  const styles: any = {
    'COMPLETED': 'bg-green-100 text-green-700',
    'PAID': 'bg-green-100 text-green-700',
    'PENDING': 'bg-amber-100 text-amber-700',
    'FAILED': 'bg-red-100 text-red-700',
    'REFUNDED': 'bg-slate-100 text-slate-700',
  };

  // Default fallback
  let style = styles[normalizedStatus] || 'bg-slate-100 text-slate-700';
  let label = status;

  if (normalizedStatus === 'PAID') label = 'Pago';
  if (normalizedStatus === 'COMPLETED') label = 'Concluído';
  if (normalizedStatus === 'PENDING') label = 'Pendente';
  if (normalizedStatus === 'FAILED') label = 'Falhou';

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase ${style}`}>
      {label}
    </span>
  );
};

export const TransactionHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Menu & Receipt State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const user = authService.getUser();
            if (user && user.id) {
                const data = await authService.getWalletLedger(user.id);
                setTransactions(data);
            }
        } catch (err: any) {
            setError('Não foi possível carregar o histórico.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    fetchTransactions();

    // Close menu on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrintReceipt = () => {
    if (!viewingReceipt) return;
    
    // Create a print-friendly window
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
        const win = window.open('', '', 'height=800,width=600');
        if (win) {
            win.document.write('<html><head><title>Comprovante - Mutual Fintech</title>');
            win.document.write('<script src="https://cdn.tailwindcss.com"></script>'); 
            win.document.write('</head><body class="bg-white p-8">');
            win.document.write(printContent.innerHTML);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => {
                win.print();
                win.close();
            }, 500);
        }
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl lg:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col relative min-h-[500px]">
      <div className="p-5 lg:p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
             <h2 className="text-xl font-bold text-slate-900">Histórico</h2>
             <p className="text-sm text-slate-500">Todas as movimentações da conta.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-amber-500/20 outline-none w-full sm:w-64 transition-all hover:bg-slate-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 sm:flex-none p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors flex justify-center items-center">
                <Filter className="w-4 h-4" />
            </button>
            <button className="flex-1 sm:flex-none p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors flex justify-center items-center">
                <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[300px]" ref={menuRef}>
        {isLoading ? (
            <div className="p-10 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        ) : error ? (
            <div className="p-10 flex flex-col items-center text-red-500 gap-2">
                <AlertCircle className="w-8 h-8" />
                <p>{error}</p>
            </div>
        ) : transactions.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
                Nenhuma transação encontrada.
            </div>
        ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                <th className="px-6 lg:px-8 py-4 font-semibold text-slate-500 text-xs">Descrição</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs">Data</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs">Valor</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs">Status</th>
                <th className="px-6 py-4"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((transaction) => {
                // Logic based on Type (Credit/Debit) or Amount sign
                const typeStr = String(transaction.type || '').toUpperCase();
                const isIncome = typeStr === 'CREDIT' || typeStr === 'PIX_IN' || transaction.amount > 0;
                const displayAmount = Math.abs(transaction.amount);

                // Format date safely
                let displayDate = transaction.date;
                try {
                    displayDate = new Date(transaction.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                } catch (e) {}

                return (
                <tr key={transaction.id} className="hover:bg-slate-50/50 transition-colors group relative">
                    <td className="px-6 lg:px-8 py-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">{transaction.description || 'Transação'}</p>
                            <p className="text-xs text-slate-400 font-mono">{transaction.id.substring(0, 12)}...</p>
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-5 text-slate-500 font-medium capitalize">{displayDate}</td>
                    <td className={`px-6 py-5 font-bold ${isIncome ? 'text-green-600' : 'text-slate-900'}`}>
                    {isIncome ? '+ ' : '- '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayAmount)}
                    </td>
                    <td className="px-6 py-5">
                    <StatusBadge status={String(transaction.status)} />
                    </td>
                    <td className="px-6 py-5 text-right relative">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === transaction.id ? null : transaction.id);
                            }}
                            className={`p-2 rounded-lg transition-colors ${activeMenuId === transaction.id ? 'bg-amber-100 text-amber-700' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeMenuId === transaction.id && (
                            <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-1">
                                    <button 
                                        onClick={() => {
                                            setViewingReceipt(transaction);
                                            setActiveMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Ver Comprovante
                                    </button>
                                </div>
                            </div>
                        )}
                    </td>
                </tr>
                )})}
            </tbody>
            </table>
        )}
      </div>
      
      {/* RECEIPT MODAL */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#F8FAFC] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
                
                {/* Modal Header Controls */}
                <div className="flex justify-between items-center p-4 bg-white border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Detalhes da Transação</h3>
                    <button 
                        onClick={() => setViewingReceipt(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Printable Content Area */}
                <div id="receipt-content" className="p-6 bg-[#F8FAFC]">
                    {/* Receipt Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                        {/* Decorative Top Border */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#0F172A]"></div>
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-amber-500 rounded-b-md"></div>

                        <div className="flex flex-col items-center mb-8 pt-4">
                            <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center mb-3">
                                <MutualLogo className="w-7 h-7" color="text-amber-500" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Comprovante</h2>
                            <p className="text-xs text-slate-400 font-medium">Mutual Fintech Services</p>
                        </div>

                        <div className="text-center mb-8">
                             <p className="text-sm text-slate-500 font-medium mb-1">Valor Total</p>
                             <h1 className="text-3xl font-bold text-slate-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(viewingReceipt.amount))}
                             </h1>
                             <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 ${viewingReceipt.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                <CheckCircle className="w-3 h-3" />
                                {viewingReceipt.status.toUpperCase() === 'COMPLETED' ? 'Confirmado' : viewingReceipt.status}
                             </div>
                        </div>

                        <div className="space-y-4 text-sm relative">
                            {/* Dashed Line */}
                            <div className="absolute -left-6 -right-6 top-[-15px] border-t border-dashed border-slate-200"></div>

                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Tipo</span>
                                <span className="font-semibold text-slate-900">
                                    {viewingReceipt.amount > 0 ? 'Entrada (Crédito)' : 'Saída (Débito)'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Data e Hora</span>
                                <span className="font-semibold text-slate-900 text-right">
                                    {new Date(viewingReceipt.date).toLocaleString('pt-BR')}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Beneficiário/Origem</span>
                                <span className="font-semibold text-slate-900 max-w-[180px] truncate text-right">
                                    {viewingReceipt.pixKey || viewingReceipt.customerName || 'Cliente Mutual'}
                                </span>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-4">
                                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">ID da Transação</span>
                                <p className="font-mono text-xs text-slate-600 break-all">
                                    {viewingReceipt.id}
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Autenticação</span>
                                <p className="font-mono text-xs text-slate-600 break-all">
                                    {btoa(viewingReceipt.id + viewingReceipt.date).substring(0, 32)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                            <p className="text-[10px] text-slate-400">
                                Este comprovante possui valor legal e pode ser utilizado para conferência.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                    <button 
                        onClick={handlePrintReceipt}
                        className="flex-1 py-3 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Salvar PDF
                    </button>
                    <button className="flex-1 py-3 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Compartilhar
                    </button>
                </div>

            </div>
        </div>
      )}
      
      <div className="p-6 border-t border-slate-100 flex justify-center">
        <button className="text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors uppercase tracking-wide">
            Ver Extrato Completo
        </button>
      </div>
    </div>
  );
};
