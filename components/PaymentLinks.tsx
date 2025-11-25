
import React, { useState } from 'react';
import { Plus, Link as LinkIcon, Copy, Trash2, ExternalLink, QrCode, Loader2, Check } from 'lucide-react';
import { authService } from '../services/authService';

export const PaymentLinks: React.FC = () => {
  const [links, setLinks] = useState<any[]>([
    { id: 1, name: 'Assinatura Mensal', value: 99.90, active: true, views: 124, paid: 45 },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', value: '' });
  const [isCreating, setIsCreating] = useState(false);
  
  // State to show QR Code after creation
  const [activeQrLink, setActiveQrLink] = useState<any>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
        const val = parseFloat(newLink.value.replace(/\D/g, '')) / 100;
        
        // Use authService to create a REAL Pix charge associated with this link
        const createdLink = await authService.createPaymentLink({
            name: newLink.name,
            value: val
        });

        setLinks([createdLink, ...links]);
        setShowCreateModal(false);
        setNewLink({ name: '', value: '' });
    } catch (error) {
        console.error("Failed to create link", error);
    } finally {
        setIsCreating(false);
    }
  };

  const CopyButton = ({ text }: { text: string }) => {
      const [copied, setCopied] = useState(false);
      const handleCopy = () => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      };
      return (
          <button onClick={handleCopy} className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Links de Pagamento</h2>
          <p className="text-slate-500">Gere cobranças Pix rápidas para seus produtos.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-amber-500 text-slate-900 px-5 py-3 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-5 h-5" />
          Gerar Novo Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map((link) => (
          <div key={link.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all group relative overflow-hidden">
            {/* Active Stripe */}
            <div className={`absolute top-0 left-0 w-1 h-full ${link.active ? 'bg-green-500' : 'bg-slate-300'}`}></div>

            <div className="flex justify-between items-start mb-4 pl-2">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
                <LinkIcon className="w-6 h-6" />
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${link.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {link.active ? 'ATIVO' : 'EXPIRADO'}
              </span>
            </div>
            
            <div className="pl-2">
                <h3 className="font-bold text-slate-900 text-lg mb-1 truncate">{link.name}</h3>
                <p className="text-slate-500 text-sm font-mono mb-6">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(link.value)}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                    <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Criado em</span>
                    <span className="font-semibold text-slate-900 text-xs">Hoje</span>
                </div>
                <div>
                    <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Vendas</span>
                    <span className="font-semibold text-slate-900">{link.paid}</span>
                </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    {/* If we have a QR code generated, show button */}
                    {link.qrCode && (
                        <button 
                            onClick={() => setActiveQrLink(link)}
                            className="flex-1 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <QrCode className="w-4 h-4" /> Ver QR Code
                        </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Overlay for Creating */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Novo Link de Pagamento</h3>
              
              <form onSubmit={handleCreate} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Produto/Serviço</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="Ex: Consultoria 1h"
                      value={newLink.name}
                      onChange={e => setNewLink({...newLink, name: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Valor</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      placeholder="R$ 0,00"
                      value={newLink.value}
                      onChange={(e) => {
                         const val = e.target.value.replace(/\D/g, '');
                         const fmt = (parseInt(val || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                         setNewLink({...newLink, value: fmt})
                      }}
                    />
                 </div>
                 
                 <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                    <p>Ao criar este link, um QR Code Pix será gerado automaticamente.</p>
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50"
                      disabled={isCreating}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={!newLink.name || !newLink.value || isCreating}
                      className="flex-1 py-2.5 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Link'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal for Viewing QR Code */}
      {activeQrLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center relative">
                <button 
                    onClick={() => setActiveQrLink(null)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <Trash2 className="w-5 h-5 rotate-45" /> {/* Close Icon Simulation */}
                </button>

                <h3 className="text-lg font-bold text-slate-900 mb-1">{activeQrLink.name}</h3>
                <p className="text-2xl font-bold text-amber-600 mb-6">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeQrLink.value)}
                </p>

                <div className="flex justify-center mb-6">
                     <img 
                        src={activeQrLink.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeQrLink.qrCode)}`} 
                        alt="QR Code" 
                        className="w-48 h-48 border border-slate-100 rounded-lg"
                    />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left mb-6">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pix Copia e Cola</label>
                    <div className="flex gap-2">
                        <input readOnly value={activeQrLink.qrCode} className="flex-1 bg-white border border-slate-200 text-xs p-1.5 rounded text-slate-600" />
                        <CopyButton text={activeQrLink.qrCode} />
                    </div>
                </div>

                <button 
                    onClick={() => setActiveQrLink(null)}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
                >
                    Fechar
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
