
import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Lock, Gavel, Search, CheckCircle, UploadCloud, X, FileText, Send } from 'lucide-react';
import { MedAlert } from '../types';

export const MedManagement: React.FC = () => {
  // Mock Data
  const [alerts, setAlerts] = useState<MedAlert[]>([
    {
        id: 'MED-2025-001',
        transactionId: 'TX-982374928374',
        amount: 1250.00,
        reason: 'SCAM',
        status: 'OPEN',
        requesterBank: 'Banco Inter',
        openedAt: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000 * 2).toISOString() // 2 days from now
    },
    {
        id: 'MED-2025-002',
        transactionId: 'TX-123123123123',
        amount: 450.00,
        reason: 'HACK',
        status: 'ANALYSIS',
        requesterBank: 'Nubank',
        openedAt: new Date(Date.now() - 86400000).toISOString(),
        deadline: new Date(Date.now() + 86400000).toISOString()
    }
  ]);

  const [selectedAlert, setSelectedAlert] = useState<MedAlert | null>(null);
  const [defenseText, setDefenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleOpenDefense = (alert: MedAlert) => {
      setSelectedAlert(alert);
      setDefenseText('');
  };

  const handleSubmitDefense = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAlerts(alerts.map(a => a.id === selectedAlert?.id ? { ...a, status: 'ANALYSIS' } : a));
      setIsSubmitting(false);
      setSelectedAlert(null);
  };

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
            Gestão MED
        </h2>
        <p className="text-slate-500 mt-1">
            Gerencie alertas de fraude e solicitações de devolução (Mecanismo Especial de Devolução).
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bloqueio Cautelar</p>
                <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(1700.00)}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                <Lock className="w-6 h-6" />
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alertas em Aberto</p>
                <h3 className="text-3xl font-bold text-slate-900">2</h3>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-6 h-6" />
            </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Taxa de Resolução</p>
                <h3 className="text-3xl font-bold text-emerald-600">98.5%</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                <Gavel className="w-6 h-6" />
            </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="font-bold text-slate-900">Solicitações Recentes</h3>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar ID ou Transação" 
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
              </div>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                      <tr>
                          <th className="px-6 py-4">ID / Transação</th>
                          <th className="px-6 py-4">Motivo</th>
                          <th className="px-6 py-4">Banco Solicitante</th>
                          <th className="px-6 py-4">Valor Bloqueado</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Prazo</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {alerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                  <div className="font-bold text-slate-900">{alert.id}</div>
                                  <div className="text-xs text-slate-400 font-mono">{alert.transactionId}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                                      {alert.reason === 'SCAM' ? 'Golpe' : alert.reason === 'HACK' ? 'Invasão' : 'Fraude'}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-medium">
                                  {alert.requesterBank}
                              </td>
                              <td className="px-6 py-4 font-bold text-amber-600">
                                  {formatCurrency(alert.amount)}
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                                      alert.status === 'OPEN' ? 'bg-rose-100 text-rose-700' : 
                                      alert.status === 'ANALYSIS' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                      {alert.status === 'OPEN' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                                      {alert.status === 'OPEN' ? 'Aberto' : alert.status === 'ANALYSIS' ? 'Em Análise' : 'Concluído'}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-xs font-bold text-rose-600">
                                      {new Date(alert.deadline).toLocaleDateString('pt-BR')}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                      {Math.ceil((new Date(alert.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias restantes
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => handleOpenDefense(alert)}
                                        disabled={alert.status !== 'OPEN'}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                        title="Apresentar Defesa"
                                      >
                                          <Gavel className="w-4 h-4" />
                                      </button>
                                      <button className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Aceitar Devolução">
                                          <CheckCircle className="w-4 h-4" />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* DEFENSE MODAL */}
      {selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              <Gavel className="w-5 h-5 text-indigo-600" />
                              Apresentar Defesa
                          </h3>
                          <p className="text-sm text-slate-500">
                              Disputa ID: <span className="font-mono font-bold text-slate-700">{selectedAlert.id}</span>
                          </p>
                      </div>
                      <button onClick={() => setSelectedAlert(null)} className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-full border border-slate-200 transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto space-y-6">
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                              <p className="text-sm font-bold text-amber-800">Atenção ao Prazo</p>
                              <p className="text-sm text-amber-700 mt-1">
                                  Você tem até <span className="font-bold">{new Date(selectedAlert.deadline).toLocaleDateString('pt-BR')}</span> para enviar documentos comprobatórios.
                                  A falta de defesa resultará no aceite automático da devolução.
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Valor Contestado</span>
                              <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedAlert.amount)}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Motivo Alegado</span>
                              <p className="text-xl font-bold text-slate-900">
                                  {selectedAlert.reason === 'SCAM' ? 'Golpe / Engenharia Social' : 'Invasão de Conta'}
                              </p>
                          </div>
                      </div>

                      <form id="defense-form" onSubmit={handleSubmitDefense} className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Argumentação da Defesa</label>
                              <textarea 
                                  required
                                  value={defenseText}
                                  onChange={(e) => setDefenseText(e.target.value)}
                                  className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none text-slate-700"
                                  placeholder="Descreva detalhadamente porque esta transação é legítima (ex: cliente autenticado, produto entregue, histórico positivo)..."
                              />
                          </div>

                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Anexar Comprovantes</label>
                              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                  <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                      <UploadCloud className="w-6 h-6" />
                                  </div>
                                  <p className="text-sm font-bold text-slate-700">Clique para fazer upload</p>
                                  <p className="text-xs text-slate-400 mt-1">PDF, JPG ou PNG (Max 5MB)</p>
                                  <p className="text-[10px] text-slate-400 mt-4 bg-slate-100 px-3 py-1 rounded-full">
                                      Notas fiscais, logs de acesso, conversas, comprovantes de entrega
                                  </p>
                              </div>
                          </div>
                      </form>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button 
                          type="button"
                          onClick={() => setSelectedAlert(null)}
                          className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-white transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          type="submit"
                          form="defense-form"
                          disabled={!defenseText || isSubmitting}
                          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                      >
                          {isSubmitting ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Defesa</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
