import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Lock, Gavel, Search, CheckCircle, UploadCloud, X, Send, MoreHorizontal } from 'lucide-react';
import { MedAlert } from '../types';
import { adminService } from '../services/adminService';

export const MedManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<MedAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<MedAlert | null>(null);
  const [defenseText, setDefenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [medSummary, setMedSummary] = useState<any>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const loadMed = async () => {
      try {
        const summary = await adminService.getMedSummary();
        setMedSummary(summary);
        
        const list = await adminService.getMedList({ status: 'OPEN' });
        // Ensure list is an array before setting state
        setAlerts(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load MED data", err);
        setAlerts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadMed();
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleOpenDefense = async (alertId: string) => {
    try {
        setIsLoading(true);
        const detail = await adminService.getMedDetail(alertId);
        setSelectedAlert(detail);
        setDefenseText('');
        setActionMenuId(null);
    } catch (e) {
        console.error("Error fetching detail", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSubmitDefense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAlert) return;
      
      setIsSubmitting(true);
      try {
          await adminService.sendMedDefense(selectedAlert.id, { defenseText });
          const list = await adminService.getMedList({ status: 'OPEN' });
          setAlerts(Array.isArray(list) ? list : []);
          setSelectedAlert(null);
      } catch (e) {
          console.error("Error sending defense", e);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAction = async (id: string, action: 'ACCEPT_REFUND' | 'REJECT_REFUND' | 'MARK_UNDER_REVIEW') => {
      try {
          await adminService.medAction(id, { action });
          const list = await adminService.getMedList({ status: 'OPEN' });
          setAlerts(Array.isArray(list) ? list : []);
          setActionMenuId(null);
      } catch (e) {
          console.error("Action failed", e);
      }
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'OPEN': return 'bg-red-100 text-red-700';
          case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-700';
          case 'DEFENSE_SENT': return 'bg-amber-100 text-amber-700';
          case 'ACCEPTED': return 'bg-emerald-100 text-emerald-700';
          case 'REJECTED': return 'bg-violet-100 text-violet-700';
          default: return 'bg-slate-100 text-slate-600';
      }
  };

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'OPEN': return 'ABERTO';
          case 'UNDER_REVIEW': return 'EM ANÁLISE';
          case 'DEFENSE_SENT': return 'DEFESA ENVIADA';
          case 'ACCEPTED': return 'ACEITO';
          case 'REJECTED': return 'RECUSADO';
          default: return status;
      }
  };

  if (isLoading && !alerts.length) return <div className="p-10 text-center">Carregando gestão de disputas...</div>;

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
      {medSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bloqueio Cautelar</p>
                    <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(medSummary.blockedAmount)}</h3>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                    <Lock className="w-6 h-6" />
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alertas em Aberto</p>
                    <h3 className="text-3xl font-bold text-slate-900">{medSummary.openCount}</h3>
                </div>
                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                    <AlertTriangle className="w-6 h-6" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total de Disputas</p>
                    <h3 className="text-3xl font-bold text-indigo-600">{medSummary.totalCount}</h3>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                    <Gavel className="w-6 h-6" />
                </div>
            </div>
        </div>
      )}

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
                          <th className="px-6 py-4">Código MED</th>
                          <th className="px-6 py-4">Transaction ID</th>
                          <th className="px-6 py-4">Motivo</th>
                          <th className="px-6 py-4">Banco Solicitante</th>
                          <th className="px-6 py-4">Valor Bloqueado</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Prazo</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {Array.isArray(alerts) && alerts.length > 0 ? alerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">
                                  {alert.id}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                  {alert.transactionId}
                              </td>
                              <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                                      {alert.reason}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 font-medium">
                                  {alert.requesterBank}
                              </td>
                              <td className="px-6 py-4 font-bold text-amber-600">
                                  {formatCurrency(alert.amount)}
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusBadge(alert.status)}`}>
                                      {getStatusLabel(alert.status)}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-xs font-bold text-rose-600">
                                      {new Date(alert.deadline).toLocaleDateString('pt-BR')}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right relative">
                                  <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => handleOpenDefense(alert.id)}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" 
                                        title="Ver Detalhes / Defesa"
                                      >
                                          <Gavel className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setActionMenuId(actionMenuId === alert.id ? null : alert.id)}
                                        className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                      >
                                          <MoreHorizontal className="w-4 h-4" />
                                      </button>
                                  </div>
                                  
                                  {actionMenuId === alert.id && (
                                      <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-1 flex flex-col gap-1">
                                          <button onClick={() => handleAction(alert.id, 'ACCEPT_REFUND')} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg w-full text-left">
                                              <CheckCircle className="w-3 h-3" /> Aceitar Devolução
                                          </button>
                                          <button onClick={() => handleAction(alert.id, 'REJECT_REFUND')} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg w-full text-left">
                                              <X className="w-3 h-3" /> Recusar Devolução
                                          </button>
                                          <button onClick={() => handleAction(alert.id, 'MARK_UNDER_REVIEW')} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg w-full text-left">
                                              <ShieldAlert className="w-3 h-3" /> Marcar em Análise
                                          </button>
                                      </div>
                                  )}
                              </td>
                          </tr>
                      )) : (
                        <tr>
                            <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                                Nenhuma solicitação em aberto encontrada.
                            </td>
                        </tr>
                      )}
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
                              Detalhes da Disputa
                          </h3>
                          <p className="text-sm text-slate-500">
                              Código: <span className="font-mono font-bold text-slate-700">{selectedAlert.id}</span>
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
                                  Prazo limite: <span className="font-bold">{new Date(selectedAlert.deadline).toLocaleDateString('pt-BR')}</span>.
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Valor Contestado</span>
                              <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedAlert.amount)}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Status Atual</span>
                              <span className={`inline-flex mt-1 items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${getStatusBadge(selectedAlert.status)}`}>
                                  {getStatusLabel(selectedAlert.status)}
                              </span>
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
                                  placeholder="Descreva detalhadamente a defesa..."
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
                          Fechar
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