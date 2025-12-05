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

// --- HELPER DE LIMPEZA DE DESCRIÇÃO ---
const cleanDescription = (desc: string, type: string, amount: number) => {
    if (!desc) return amount > 0 ? 'Depósito Pix' : 'Transferência Pix';

    // 1. Tentar parsear se for JSON
    if (desc.trim().startsWith('{') || desc.trim().startsWith('[')) {
        try {
            const obj = JSON.parse(desc);
            // Tenta pegar campos comuns
            if (obj.description) return obj.description;
            if (obj.reason) return obj.reason;
            if (obj.type === 'PIX') return amount > 0 ? 'Recebimento Pix' : 'Envio Pix';
        } catch (e) {
            // Se falhar o parse, continua para as regras de string
        }
    }

    // 2. Limpeza de Strings "Sujas" (Gateways, IDs técnicos)
    const lower = desc.toLowerCase();

    if (lower.includes('starpago') || lower.includes('merorderno') || lower.includes('wd-')) {
        return 'Saque Pix';
    }
    
    if (lower.includes('pix sent') || lower.includes('envio pix')) return 'Envio Pix';
    if (lower.includes('pix received') || lower.includes('recebimento pix')) return 'Recebimento Pix';
    if (lower.includes('depósito') || lower.includes('deposit')) return 'Depósito Pix';
    if (lower.includes('withdraw') || lower.includes('saque')) return 'Saque Pix';

    // 3. Fallback genérico baseado no tipo se a descrição for muito genérica ou técnica demais
    if (desc === 'Transação' || desc === 'Wallet Transfer' || desc.length > 50) {
        return amount > 0 ? 'Depósito Pix' : 'Saque Pix';
    }

    return desc;
};

// --- FORMATTERS & CLIPBOARD ---
const formatCpfCnpj = (doc?: string) => {
    if (!doc) return '-';
    const digits = doc.replace(/\D/g, '');
    if (digits.length <= 11) {
        return digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch { /* ignore */ }
};

export const TransactionHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'detailed' | 'consolidated'>('detailed');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchField, setSearchField] = useState<'all'|'id'|'description'|'status'|'valor'|'cliente'|'documento'|'e2e'|'externo'>('all');
  const [operator, setOperator] = useState<'equal'|'contains'>('contains');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);
    const [modalTop, setModalTop] = useState<number | null>(null);
    const [inlineReceiptId, setInlineReceiptId] = useState<string | null>(null);
  const [actionsTx, setActionsTx] = useState<Transaction | null>(null);
  const [showIn, setShowIn] = useState(true);
  const [showOut, setShowOut] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days' | '90days' | 'quarter' | 'year' | 'custom'>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const menuRef = useRef<HTMLDivElement>(null);

    // Load transactions from API
    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const ledger = await authService.getWalletLedger();
            setTransactions(Array.isArray(ledger) ? ledger : []);
        } catch (err) {
            setError('Falha ao carregar histórico.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenuId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Set default tab from localStorage (if present)
    useEffect(() => {
        const desired = localStorage.getItem('transactionsDefaultTab');
        if (desired === 'consolidated' || desired === 'detailed') {
            setActiveTab(desired as 'detailed' | 'consolidated');
        }
    }, []);

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
            } else if (dateFilter === '90days') {
                    const limit = new Date(now); limit.setDate(limit.getDate() - 90);
                    filtered = filtered.filter(t => new Date(t.date) >= limit);
            } else if (dateFilter === 'custom' && startDate && endDate) {
                    const start = new Date(startDate + 'T00:00:00');
                    const end = new Date(endDate + 'T23:59:59');
                    filtered = filtered.filter(t => {
                            const d = new Date(t.date);
                            return d >= start && d <= end;
                    });
      }

      // Search Filter
            if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    const match = (value: string) => operator === 'equal' ? value.toLowerCase() === term : value.toLowerCase().includes(term);
                    filtered = filtered.filter(t => {
                        const desc = cleanDescription(t.description, t.type, t.amount);
                        const amountStr = String(Math.abs(t.amount));
                        const cliente = (t as any).clientName || t.recipient || t.sender || '';
                        const documento = (t as any).document ? String((t as any).document).replace(/\D/g, '') : '';
                        const pixId = (t as any).pix || (t as any).txid || '';
                        const e2e = (t as any).e2e || (t as any).endToEndId || '';
                        const externo = (t as any).externalId || (t as any).referenceId || (t as any).external || '';
                        if (searchField === 'all') {
                            return match(desc) || match(t.id) || match(String(t.status)) || match(amountStr) || match(cliente) || match(documento) || match(e2e) || match(externo);
                        } else if (searchField === 'id') {
                            return match(t.id);
                        } else if (searchField === 'description') {
                            return match(desc);
                        } else if (searchField === 'status') {
                            return match(String(t.status));
                        } else if (searchField === 'valor') {
                            return match(amountStr);
                        } else if (searchField === 'cliente') {
                            return match(cliente);
                        } else if (searchField === 'documento') {
                            return match(documento);
                        } else if (searchField === 'e2e') {
                            return match(e2e);
                        } else if (searchField === 'externo') {
                            return match(externo);
                        }
                        return false;
                    });
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
          `"${cleanDescription(tx.description, tx.type, tx.amount)}"`,
          tx.type === 'CREDIT' ? 'Entrada' : 'Saída',
          tx.amount.toFixed(2).replace('.', ','),
          tx.status,
          tx.sender || '-',
          tx.recipient || '-'
      ]);

      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
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
                            <td>${cleanDescription(tx.description, tx.type, tx.amount)}</td>
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

    const handleExportJSON = () => {
        const data = getFilteredTransactions();
        if (!data.length) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extrato_omini_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportTXT = () => {
        const data = getFilteredTransactions();
        if (!data.length) return;
        const lines = data.map(tx => `${new Date(tx.date).toLocaleString('pt-BR')} | ${tx.id} | ${cleanDescription(tx.description, tx.type, tx.amount)} | ${(tx.type==='CREDIT'||tx.amount>0)?'+':'-'} R$ ${Math.abs(tx.amount).toFixed(2)}`);
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extrato_omini_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportXLS = () => {
        // Simple XLS (HTML table) for quick compatibility
        const data = getFilteredTransactions();
        if (!data.length) return;
        const headers = ['Data','Hora','ID','Descrição','Tipo','Status','Valor'];
        const rows = data.map(tx => [
            new Date(tx.date).toLocaleDateString('pt-BR'),
            new Date(tx.date).toLocaleTimeString('pt-BR'),
            tx.id,
            cleanDescription(tx.description, tx.type, tx.amount),
            (tx.type==='CREDIT'||tx.amount>0)?'Entrada':'Saída',
            String(tx.status),
            Math.abs(tx.amount).toFixed(2).replace('.', ',')
        ]);
        const table = `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        const blob = new Blob([`\ufeff${table}`], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extrato_omini_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleResendWebhook = async (tx?: Transaction) => {
        const target = tx || actionsTx;
        if (!target) return;
        // TODO: wire to API endpoint /API/... when available
        alert(`Webhook reenviado para a transação ${target.id}.`);
    };

    const handleRefund = async (tx?: Transaction) => {
        const target = tx || actionsTx;
        if (!target) return;
        // TODO: wire to API endpoint /API/... when available
        const ok = confirm(`Confirmar estorno da transação ${target.id}?`);
        if (ok) {
            alert('Solicitação de estorno enviada.');
        }
    };

    // --- CHART DATA GENERATION ---
    const getConsolidatedData = () => {
            const txs = getFilteredTransactions(); // Uses same date filter

            // Build dynamic date range based on filter
            const days: string[] = [];
            const now = new Date();
            let start = new Date(now);
            let end = new Date(now);
            if (dateFilter === 'today') {
                start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            } else if (dateFilter === 'yesterday') {
                start.setDate(start.getDate()-1); start.setHours(0,0,0,0); end = new Date(start); end.setHours(23,59,59,999);
            } else if (dateFilter === '7days') {
                start.setDate(start.getDate()-6); start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            } else if (dateFilter === '30days') {
                start.setDate(start.getDate()-29); start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            } else if (dateFilter === '90days') {
                start.setDate(start.getDate()-89); start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            } else if (dateFilter === 'quarter') {
                start.setDate(start.getDate()-89); start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            } else if (dateFilter === 'year') {
                const currentYear = now.getFullYear();
                start = new Date(currentYear, 0, 1, 0, 0, 0, 0);
                end = new Date(currentYear, 11, 31, 23, 59, 59, 999);
            } else if (dateFilter === 'custom' && startDate && endDate) {
                start = new Date(startDate + 'T00:00:00');
                end = new Date(endDate + 'T23:59:59');
            } else {
                start.setDate(start.getDate()-29); start.setHours(0,0,0,0); end.setHours(23,59,59,999);
            }

            const dailyMap: {[key: string]: {date: string, in: number, out: number, balanceDelta: number}} = {};
            for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
                const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                days.push(key);
                dailyMap[key] = { date: key, in: 0, out: 0, balanceDelta: 0 };
            }

            const distribution = { in: 0, out: 0 };
            txs.forEach(tx => {
                    const key = new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
                    const amount = Math.abs(tx.amount);
                    if (!dailyMap[key]) dailyMap[key] = { date: key, in: 0, out: 0, balanceDelta: 0 };
                    if (isCredit) {
                            if (showIn) { dailyMap[key].in += amount; dailyMap[key].balanceDelta += amount; }
                            distribution.in += amount;
                    } else {
                            if (showOut) { dailyMap[key].out += amount; dailyMap[key].balanceDelta -= amount; }
                            distribution.out += amount;
                    }
            });

            const chartData = Object.values(dailyMap);
            const pieData = [
                    { name: 'Entradas', value: showIn ? distribution.in : 0, color: '#10B981' },
                    { name: 'Saídas', value: showOut ? distribution.out : 0, color: '#F43F5E' }
            ];

            return { chartData, pieData, tableData: [...chartData].reverse() };
    };

  const filteredTx = getFilteredTransactions();
  const consolidated = getConsolidatedData();
    const isDebitTx = (t: Transaction) => {
        const status = String((t as any).status || '').toLowerCase();
        const type = String((t as any).type || '').toLowerCase();
        const desc = String((t as any).description || '').toLowerCase();
        if (type === 'debit') return true;
        if (type === 'credit') return false;
        const withdrawFlag = status.includes('withdraw') || type.includes('withdraw') || desc.includes('withdraw');
        const paidFlag = status.includes('paid') || status.includes('completed');
        if (withdrawFlag && paidFlag) return true;
        return Number(t.amount) < 0;
    };
    const isCreditTx = (t: Transaction) => {
        const type = String((t as any).type || '').toLowerCase();
        if (type === 'credit') return true;
        if (type === 'debit') return false;
        return Number(t.amount) > 0;
    };

    const subtotal = {
        totalTransactions: filteredTx.length,
        totalReceived: filteredTx.filter(isCreditTx).reduce((acc, t) => acc + Math.abs(t.amount), 0),
        totalSent: filteredTx.filter(isDebitTx).reduce((acc, t) => acc + Math.abs(t.amount), 0),
    };
    const netBalance = subtotal.totalReceived - subtotal.totalSent;

    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col w-full max-w-none"> 
      
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

        {/* Header Actions (Detailed Only) */}
        {activeTab === 'detailed' && (
            <div className="space-y-4">
                {/* Filtros de Data (Detalhado) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3 text-slate-700 font-bold"><Calendar className="w-4 h-4" /> Filtros de Data</div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'today', label: 'Hoje' },
                            { id: 'yesterday', label: 'Ontem' },
                            { id: '7days', label: '7 dias' },
                            { id: '30days', label: '30 dias' },
                            { id: '90days', label: '90 dias' },
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setDateFilter(f.id as any)}
                                className={`px-4 py-2 rounded-lg border text-xs font-bold tracking-wide transition-colors ${
                                    dateFilter === f.id 
                                    ? 'bg-[#1F2A56] text-white border-[#1F2A56]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                        <button onClick={() => setDateFilter('custom')} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold tracking-wide flex items-center gap-2 hover:bg-slate-50">
                            <Calendar className="w-3 h-3" /> Personalizar
                        </button>
                    </div>
                    {dateFilter === 'custom' && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-500 font-bold">Data Início</label>
                                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold">Data Final</label>
                                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Ações rápidas */}
                <div className="flex justify-end gap-2">
                <button 
                    onClick={handleExportCSV}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                    <Download className="w-4 h-4" /> CSV
                </button>
                <button 
                    onClick={handleExportPDF}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                    <FileText className="w-4 h-4" /> PDF
                </button>
                <button onClick={fetchTransactions} className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                </div>
        
            {/* Help Card + Search Bar (Detailed Only) */}
             <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">i</div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 mb-1">Como usar</p>
                        <p className="text-sm text-slate-700 mb-3">Escolha um campo para buscar ou "Todos" para busca geral. Use "Igual" (exato) ou "Contém" (parcial).</p>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                <span className="w-5 h-5 rounded-full bg-white/60 text-emerald-700 grid place-items-center">1</span> Campo
                            </span>
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                <span className="w-5 h-5 rounded-full bg-white/60 text-amber-700 grid place-items-center">2</span> Tipo
                            </span>
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                <span className="w-5 h-5 rounded-full bg-white/60 text-emerald-700 grid place-items-center">3</span> Valor
                            </span>
                        </div>
                        <p className="text-xs text-slate-600"><span className="font-bold">Dica:</span> Digite qualquer informação para busca geral</p>
                    </div>
                </div>
             </div>
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
                        <select value={searchField} onChange={e=>setSearchField(e.target.value as any)} className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none text-slate-600 appearance-none cursor-pointer">
                                <option value="all">Todos os campos</option>
                                <option value="id">ID</option>
                                <option value="description">Descrição</option>
                                <option value="valor">Valor</option>
                                <option value="status">Status</option>
                            <option value="e2e">E2E/TXD</option>
                            <option value="cliente">Cliente</option>
                            <option value="documento">Documento</option>
                            <option value="externo">Id Externo</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                     </div>
                     <div className="relative">
                        <select value={operator} onChange={e=>setOperator(e.target.value as any)} className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none text-slate-600 appearance-none cursor-pointer">
                                <option value="equal">Igual (exato)</option>
                                <option value="contains">Contém (parcial)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                     </div>
                     <button onClick={() => setSearchTerm('')} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors text-right">
                         Limpar Filtros
                     </button>
                </div>

                {dateFilter === 'custom' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-bold">Data inicial</label>
                            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-bold">Data final</label>
                            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                    </div>
                )}
                </div>
            </div>
        )}
        </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-x-auto bg-white min-h-[1px]" ref={menuRef}>
        {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : (
            <>
                {/* 📊 CONSOLIDATED VIEW */}
                {activeTab === 'consolidated' && (
                    <div className="p-6 lg:p-8 space-y-8">
                        {/* Filtros (Consolidado) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold"><Filter className="w-4 h-4" /> Filtros</div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 font-bold">Período</label>
                                    <select
                                        value={dateFilter}
                                        onChange={e=>setDateFilter(e.target.value as any)}
                                        className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                    >
                                        <option value="today">Hoje</option>
                                        <option value="yesterday">Ontem</option>
                                        <option value="7days">7 dias</option>
                                        <option value="30days">30 dias</option>
                                        <option value="90days">90 dias</option>
                                        <option value="quarter">Trimestre</option>
                                        <option value="year">Ano</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold">Data Início</label>
                                    <input type="date" value={startDate} onChange={e=>{ setStartDate(e.target.value); setDateFilter('custom'); }} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 font-bold">Data Final</label>
                                    <input type="date" value={endDate} onChange={e=>{ setEndDate(e.target.value); setDateFilter('custom'); }} className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                                </div>
                                <div className="flex items-end gap-2">
                                    <button onClick={fetchTransactions} className="flex-1 px-4 py-2 bg-[#0F172A] text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Filter className="w-4 h-4" /> Aplicar</button>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={handleExportCSV} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
                                <button onClick={handleExportXLS} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><Download className="w-4 h-4" /> XLSX</button>
                                <button onClick={fetchTransactions} className="ml-auto px-4 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar</button>
                            </div>
                        </div>
                        {/* Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Subtotais do período filtrado */}
                                    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-bold">Total de Transações</p>
                                            <p className="text-xl font-bold text-emerald-900">{subtotal.totalTransactions.toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Valor Total Recebido</p>
                                            <p className="text-xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal.totalReceived)}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Valor Total Enviado</p>
                                            <p className="text-xl font-bold text-rose-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal.totalSent)}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white border border-slate-200">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Saldo Líquido</p>
                                            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-slate-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}</p>
                                        </div>
                                    </div>
                            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 mb-6">Movimentação Diária</h3>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                        <input type="checkbox" checked={showIn} onChange={e=>setShowIn(e.target.checked)} /> Mostrar Entradas
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                        <input type="checkbox" checked={showOut} onChange={e=>setShowOut(e.target.checked)} /> Mostrar Saídas
                                                    </label>
                                                </div>
                                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={consolidated.chartData}>
                                            <defs>
                                                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25}/>
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
                                            {showIn && (<Area type="monotone" dataKey="in" name="Entradas" stroke="#10B981" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 5 }} />)}
                                            {showOut && (<Area type="monotone" dataKey="out" name="Saídas" stroke="#F43F5E" fillOpacity={1} fill="url(#colorOut)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 5 }} />)}
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
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={1}
                                                dataKey="value"
                                                labelLine={false}
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.45;
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                    const offset = -15;

                                                    return (
                                                        <text
                                                            x={x + (x > cx ? offset : -offset)}
                                                            y={y}
                                                            fill="#ffffffff"
                                                            textAnchor={x > cx ? 'start' : 'end'}
                                                            dominantBaseline="central"
                                                            fontSize={15}
                                                            fontWeight={700}
                                                        >
                                                            {(percent * 100).toFixed(0)}%
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {consolidated.pieData.map((entry, index) => (
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
                    <div className="p-6 lg:p-8 space-y-6">
                        {/* Totais do Período */}
                        <div className="rounded-2xl border border-black-100 bg-gray-50 p-4">
                            <p className="text-[11px] uppercase tracking-wide text-black-800 font-bold mb-">Totais do Período</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-4 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Total de Transações</p>
                                    <p className="text-xl font-bold text-slate-900">{subtotal.totalTransactions.toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Valor Total Recebido</p>
                                    <p className="text-xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal.totalReceived)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Valor Total Enviado</p>
                                    <p className="text-xl font-bold text-rose-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal.totalSent)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white border border-slate-200">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">Saldo Líquido</p>
                                    <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-indigo-600' : 'text-slate-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netBalance)}</p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2">Totais considerando todas as {subtotal.totalTransactions.toLocaleString('pt-BR')} transações do período.</p>
                        </div>

                        {/* Mobile card list */}
                        <div className="sm:hidden space-y-3">
                            {filteredTx.length === 0 ? (
                                <div className="p-4 text-center text-slate-400">Nenhum registro encontrado para este filtro.</div>
                            ) : filteredTx.map((tx, index) => {
                                const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
                                const tipoLabel = isCredit ? 'Entrada' : 'Saída';
                                const clienteFull = (tx as any).payerName || (tx as any).clientName || (tx as any).customer || tx.recipient || tx.sender || '-';
                                const cliente = (() => {
                                    if (!clienteFull || clienteFull === '-') return '-';
                                    const parts = String(clienteFull).trim().split(/\s+/);
                                    return parts.slice(0, 2).join(' ');
                                })();
                                const rawDoc = (tx as any).document || (tx as any).cpfCnpj || (tx as any).cpf || (tx as any).cnpj || '';
                                const docDigits = String(rawDoc).replace(/\D/g, '');
                                const shortDoc = docDigits.length >= 11 ? docDigits.slice(3, 9) : docDigits;
                                const documento = rawDoc ? `***.${shortDoc}.***` : '-';
                                const e2e = tx.e2e || (tx as any).e2e || (tx as any).endToEndId || '-';
                                const externo = (tx as any).providerOrderNo || (tx as any).externalId || (tx as any).referenceId || (tx as any).external || '-';
                                const shortE2E = e2e !== '-' ? String(e2e).slice(0, 10) : '-';
                                const shortExterno = externo !== '-' ? String(externo).slice(0, 10) : '-';
                                const runningBalance = (() => {
                                    const balAfter = (tx as any).balanceAfter;
                                    if (typeof balAfter === 'number' && !isNaN(balAfter)) return Number(balAfter);
                                    const sumIn = filteredTx.slice(0, index + 1)
                                        .filter(t => (t.type === 'CREDIT' || t.amount > 0))
                                        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
                                    const sumOut = filteredTx.slice(0, index + 1)
                                        .filter(t => (t.type === 'DEBIT' || t.amount < 0))
                                        .reduce((acc, t) => acc + Math.abs(t.amount), 0);
                                    return sumIn - sumOut;
                                })();
                                return (
                                                                        <div
                                                                            key={tx.id}
                                                                            className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer"
                                                                            onClick={(e) => {
                                                                                const target = e.currentTarget as HTMLElement;
                                                                                const rect = target.getBoundingClientRect();
                                                                                const offset = 190; // larger offset so modal appears clearly below click
                                                                                let top = rect.top + window.scrollY + offset;
                                                                                const marginBottom = 24;
                                                                                const maxTop = window.scrollY + (window.innerHeight - marginBottom - 300); // ensure modal header remains in viewport
                                                                                if (top > maxTop) top = maxTop;
                                                                                setViewingReceipt(tx);
                                                                                setModalTop(top);
                                                                            }}
                                                                        >
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <p className="text-slate-700 font-bold text-sm">{new Date(tx.date).toLocaleDateString()}</p>
                                                <p className="text-[11px] text-slate-400">{new Date(tx.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            </div>
                                            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border ${isCredit ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                                <TransactionIcon type={tx.type} isCredit={isCredit} />
                                                <span className="text-[11px] font-bold">{tipoLabel}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                                            <div className="text-slate-500"><span className="font-bold">E2E:</span> <span className="break-all" title={e2e}>{shortE2E}</span></div>
                                            <div className="text-slate-500"><span className="font-bold">Cliente:</span> <span className="break-all" title={clienteFull}>{cliente}</span></div>
                                            <div className="text-slate-500"><span className="font-bold">Externo:</span> <span className="break-all" title={externo}>{shortExterno}</span></div>
                                            <div className="text-slate-500"><span className="font-bold">Documento:</span> {documento}</div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 items-center">
                                            <div className={`text-[13px] font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isCredit ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(tx.amount))}
                                            </div>
                                            <div className={`text-[13px] font-bold text-right ${runningBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(runningBalance)}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-between items-center">
                                            <StatusBadge status={String(tx.status)} />
                                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === tx.id ? null : tx.id); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                            {activeMenuId === tx.id && (
                                                <div className="absolute right-4 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-1 animate-fade-in">
                                                    <button onClick={() => { setViewingReceipt(tx); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-colors">
                                                        <FileText className="w-4 h-4" /> Ver Comprovante
                                                    </button>
                                                    <button onClick={() => { setActionsTx(tx); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" /> Ações
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop/Tablet table */}
                        <table className="hidden sm:table w-full text-left text-sm whitespace-nowrap table-fixed">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Data</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">Tipo</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider hidden sm:table-cell">ID</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">E2E/TXD</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider hidden sm:table-cell">Id Externo</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">Cliente</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider hidden sm:table-cell">Documento</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right">Valor</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right">Saldo</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">Status</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTx.length === 0 ? (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Nenhum registro encontrado para este filtro.</td></tr>
                            ) : filteredTx.map((tx, index) => {
                            const isCredit = tx.type === 'CREDIT' || (tx.type !== 'DEBIT' && tx.amount > 0);
                            const tipoLabel = isCredit ? 'Entrada' : 'Saída';
                            const clienteFull = (tx as any).payerName || (tx as any).clientName || (tx as any).customer || tx.recipient || tx.sender || '-';
                            const cliente = (() => {
                                if (!clienteFull || clienteFull === '-') return '-';
                                const parts = String(clienteFull).trim().split(/\s+/);
                                return parts.slice(0, 2).join(' ');
                            })();
                            const rawDoc = (tx as any).document || (tx as any).cpfCnpj || (tx as any).cpf || (tx as any).cnpj || '';
                            const docDigits = String(rawDoc).replace(/\D/g, '');
                            const shortDoc = docDigits.length >= 11 ? docDigits.slice(3, 9) : docDigits; // Normalize: full CPF -> middle 6 digits
                            const documento = rawDoc ? `***.${shortDoc}.***` : '-';
                            const pixId = (tx as any).pix || (tx as any).txid || (tx as any).endToEndId || '-';
                            const e2e = tx.e2e || (tx as any).e2e || (tx as any).endToEndId || '-';
                            const externo = (tx as any).providerOrderNo || (tx as any).externalId || (tx as any).referenceId || (tx as any).external || '-';
                            const shortE2E = e2e !== '-' ? String(e2e).slice(0, 10) : '-';
                            const shortExterno = externo !== '-' ? String(externo).slice(0, 10) : '-';
                            const runningBalance = (() => {
                                // Prefer balance provided by backend meta
                                const balAfter = (tx as any).balanceAfter;
                                if (typeof balAfter === 'number' && !isNaN(balAfter)) return Number(balAfter);
                                // Fallback: saldo acumulado no período até esta linha (base 0)
                                const sumIn = filteredTx.slice(0, index + 1)
                                    .filter(t => (t.type === 'CREDIT' || t.amount > 0))
                                    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
                                const sumOut = filteredTx.slice(0, index + 1)
                                    .filter(t => (t.type === 'DEBIT' || t.amount < 0))
                                    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
                                return sumIn - sumOut;
                            })();
                            return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-slate-700 font-medium">{new Date(tx.date).toLocaleDateString()}</span>
                                        <span className="text-xs text-slate-400">{new Date(tx.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </td>
                                <td className="px-2 sm:px-4 py-3 sm:py-5 text-center">
                                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border ${isCredit ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                        <TransactionIcon type={tx.type} isCredit={isCredit} />
                                        <span className="text-[11px] font-bold">{tipoLabel}</span>
                                    </div>
                                </td>
                                <td className="px-2 sm:px-3 py-3 sm:py-4 font-mono text-xs text-slate-700 hidden sm:table-cell">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate max-w-[120px]" title={tx.id}>{tx.id}</span>
                                        {tx.id && (
                                            <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(tx.id)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-2 sm:px-3 py-3 sm:py-4 font-mono text-xs text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <span className="break-all sm:truncate sm:max-w-[100px]" title={e2e}>{shortE2E}</span>
                                        {e2e !== '-' && (
                                            <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(e2e)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-2 sm:px-3 py-3 sm:py-4 font-mono text-xs text-slate-500 hidden sm:table-cell">
                                    <div className="flex items-center gap-2">
                                        <span className="break-all sm:truncate sm:max-w-[120px]" title={externo}>{shortExterno}</span>
                                        {externo !== '-' && (
                                            <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(externo)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                                
                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-slate-700 font-medium">
                                    <div className="flex items-center gap-2">
                                        <span className="break-all sm:truncate sm:max-w-[180px]" title={clienteFull}>{cliente}</span>
                                        {clienteFull !== '-' && (
                                            <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(clienteFull)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-2 sm:px-3 py-3 sm:py-4 text-slate-700 font-medium hidden sm:table-cell">{documento}</td>
                                <td className={`px-2 sm:px-4 py-3 sm:py-4 font-bold text-right ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isCredit ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(tx.amount))}
                                </td>
                                <td className={`px-2 sm:px-3 py-3 sm:py-4 font-bold text-right ${runningBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(runningBalance)}
                                </td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 text-center"><StatusBadge status={String(tx.status)} /></td>
                                <td className="px-3 sm:px-6 py-3 sm:py-5 text-right relative">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === tx.id ? null : tx.id); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                    {activeMenuId === tx.id && (
                                        <div className="absolute right-12 top-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-1 animate-fade-in">
                                            <button onClick={() => { setViewingReceipt(tx); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-colors">
                                                <FileText className="w-4 h-4" /> Ver Comprovante
                                            </button>
                                            <button onClick={() => { setActionsTx(tx); setActiveMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg font-medium transition-colors">
                                                <MoreHorizontal className="w-4 h-4" /> Ações
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                            )})}
                        </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
      </div>
      
      {/* PROFESSIONAL RECEIPT MODAL */}
            {viewingReceipt && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-transparent animate-fade-in h-[99dvh]">
                        <div
                            className="bg-[#F8FAFC] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200"
                            style={modalTop !== null ? { position: 'fixed', top: `${modalTop}px`, left: '50%', transform: 'translateX(-50%)' } : {}}
                        >
                <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100 shrink-0">
                    <h3 className="font-bold text-slate-900">Comprovante de Transação</h3>
                    <button onClick={() => { setViewingReceipt(null); setModalTop(null); }} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
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
                                <p className="text-slate-500 text-sm font-medium mb-1">
                                  {(viewingReceipt as any).totalAmount ? 'Valor Total da Transação' : 'Valor Total'}
                                </p>
                                <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                      Math.abs((viewingReceipt as any).totalAmount || (viewingReceipt as any).originalAmount || viewingReceipt.amount)
                                    )}
                                </h1>
                                {/* Exibir taxa e valor final se disponível */}
                                {((viewingReceipt as any).feeAmount && (viewingReceipt as any).feeAmount > 0) && (
                                  <div className="mt-4 space-y-2">
                                    <div className="flex justify-center items-center gap-2 text-sm">
                                      <span className="text-slate-500">Taxa de transação:</span>
                                      <span className="font-bold text-amber-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((viewingReceipt as any).feeAmount)}
                                      </span>
                                    </div>
                                    {(viewingReceipt as any).finalAmount !== undefined && (
                                      <div className="flex justify-center items-center gap-2 text-sm font-bold pt-2 border-t border-slate-200">
                                        <span className="text-slate-700">Valor final:</span>
                                        <span className="text-emerald-600">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((viewingReceipt as any).finalAmount)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide mt-4">
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
                                        <p className="text-sm font-bold text-slate-900">{cleanDescription(viewingReceipt.description, viewingReceipt.type, viewingReceipt.amount)}</p>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">E2E/TXD</span>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 break-all">{(viewingReceipt as any).e2e || (viewingReceipt as any).endToEndId || '-'}</p>
                                            {((viewingReceipt as any).e2e || (viewingReceipt as any).endToEndId) && (
                                                <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(((viewingReceipt as any).e2e || (viewingReceipt as any).endToEndId))}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Id Externo</span>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 break-all">{(viewingReceipt as any).providerOrderNo || (viewingReceipt as any).externalId || (viewingReceipt as any).referenceId || (viewingReceipt as any).external || '-'}</p>
                                            {((viewingReceipt as any).providerOrderNo || (viewingReceipt as any).externalId || (viewingReceipt as any).referenceId || (viewingReceipt as any).external) && (
                                                <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(((viewingReceipt as any).providerOrderNo || (viewingReceipt as any).externalId || (viewingReceipt as any).referenceId || (viewingReceipt as any).external))}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Cliente</span>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 break-all">{(viewingReceipt as any).payerName || (viewingReceipt as any).clientName || (viewingReceipt as any).customer || viewingReceipt.recipient || viewingReceipt.sender || '-'}</p>
                                            {((viewingReceipt as any).payerName || (viewingReceipt as any).clientName || (viewingReceipt as any).customer || viewingReceipt.recipient || viewingReceipt.sender) && (
                                                <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(((viewingReceipt as any).payerName || (viewingReceipt as any).clientName || (viewingReceipt as any).customer || viewingReceipt.recipient || viewingReceipt.sender))}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Documento</span>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-900 break-all">{(viewingReceipt as any).document || (viewingReceipt as any).cpfCnpj || (viewingReceipt as any).cpf || (viewingReceipt as any).cnpj || '-'}</p>
                                            {((viewingReceipt as any).document || (viewingReceipt as any).cpfCnpj || (viewingReceipt as any).cpf || (viewingReceipt as any).cnpj) && (
                                                <button className="text-slate-400 hover:text-indigo-600" title="Copiar" onClick={()=>copyToClipboard(((viewingReceipt as any).document || (viewingReceipt as any).cpfCnpj || (viewingReceipt as any).cpf || (viewingReceipt as any).cnpj))}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
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

            {/* AÇÕES MODAL */}
            {actionsTx && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 bg-transparent animate-fade-in h-[100dvh]">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={modalTop !== null ? { position: 'fixed', top: `${modalTop}px`, left: '50%', transform: 'translateX(-50%)' } : {}}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900">Ações da Transação</h3>
                            <button onClick={() => setActionsTx(null)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-2">
                            <div className="divide-y divide-slate-100">
                                <button onClick={() => setViewingReceipt(actionsTx!)} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">1.</span> Ver comprovante
                                </button>
                                <button onClick={handlePrintReceipt} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">2.1.</span> PDF
                                </button>
                                <button onClick={handleExportCSV} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">2.2.</span> CSV
                                </button>
                                <button onClick={handleExportJSON} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">2.3.</span> JSON
                                </button>
                                <button onClick={handleExportTXT} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">2.4.</span> TXT
                                </button>
                                <button onClick={handleExportXLS} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">2.5.</span> XLS
                                </button>
                                <button onClick={() => handleResendWebhook()} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <span className="w-6 text-center">3.</span> Reenviar Webhook
                                </button>
                                <button onClick={() => handleRefund()} className="w-full flex items-center gap-2 px-3 py-3 text-sm text-rose-700 hover:bg-rose-50">
                                    <span className="w-6 text-center">4.</span> Estornar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
    </div>
  );
};