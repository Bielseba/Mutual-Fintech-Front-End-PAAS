
import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, User, ShieldCheck, Share2, Copy, AlertCircle, Calendar, ArrowLeft, QrCode, Loader2, Wallet } from 'lucide-react';
import { authService } from '../services/authService';

interface PixTransferProps {
  mode: 'pix' | 'withdraw';
  onBack: () => void;
}

export const PixTransfer: React.FC<PixTransferProps> = ({ mode, onBack }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = authService.getUser();

  // Balance State
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Generated Pix Data (For Mode 'pix' / Deposit)
  const [pixResult, setPixResult] = useState<{ qrCode: string; qrCodeImage: string; orderId: string; expiresAt: string } | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<{ orderId: string; status: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    pixKey: '',
    pixKeyType: 'CPF', // Default
    amount: '',
    description: '',
  });

  // Fetch balance on mount for validation
  useEffect(() => {
    const fetchBalance = async () => {
        if (mode === 'withdraw' && user?.id) {
            setLoadingBalance(true);
            try {
                const bal = await authService.getWalletBalance(user.id);
                setCurrentBalance(bal);
            } catch (e) {
                console.error("Failed to fetch balance for validation");
            } finally {
                setLoadingBalance(false);
            }
        }
    };
    fetchBalance();
  }, [mode, user]);

  const handleNext = async () => {
      // Logic split based on mode
      if (mode === 'pix') {
          // GENERATE PIX (Cash-In) logic
          await handleGeneratePix();
      } else {
          // WITHDRAW logic
          if (step === 1) {
             setError(null);
             if (!formData.pixKey) {
                 setError("Chave Pix é obrigatória");
                 return;
             }
             if (!formData.amount) {
                 setError("Valor é obrigatório");
                 return;
             }

             const value = parseFloat(formData.amount.replace(/\D/g, '')) / 100;
             
             // 🛑 BALANCE VALIDATION RULE
             if (currentBalance <= 0) {
                 setError("Você não possui saldo suficiente para saque.");
                 return;
             }
             if (value > currentBalance) {
                 setError(`Saldo insuficiente. Disponível: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBalance)}`);
                 return;
             }
             
             setStep(prev => prev + 1); // Go to confirm
          } else if (step === 2) {
             // Confirm step -> Execute Withdraw
             await handleWithdrawSubmit();
          }
      }
  };

  const handleBack = () => {
      if (step === 3 && mode === 'pix') { // Success screen (now 3)
          setPixResult(null);
          setFormData({ ...formData, amount: '' });
          setStep(1);
      } else if (step === 3 && mode === 'withdraw') { // Success screen (now 3)
          setWithdrawResult(null);
          setFormData({ ...formData, amount: '', pixKey: '', description: '' });
          setStep(1);
      } else {
          if (step === 1) {
              onBack();
          } else {
              setStep(prev => prev - 1);
          }
      }
  };

  const handleGeneratePix = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const value = parseFloat(formData.amount.replace(/\D/g, '')) / 100;
        if (value <= 0) throw new Error("Valor inválido.");

        const result = await authService.createPixCharge(value);
        setPixResult(result);
        setStep(3); // Jump directly to Success/Result screen
    } catch (err: any) {
        setError(err.message || "Erro ao gerar Pix.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const value = parseFloat(formData.amount.replace(/\D/g, '')) / 100;
        if (value <= 0) throw new Error("Valor inválido.");
        
        // Double check just in case
        if (value > currentBalance) throw new Error("Saldo insuficiente.");

        // Call service with key and keyType (backend maps keyType to bankCode)
        const result = await authService.createPixWithdraw(
            value, 
            formData.pixKey, 
            formData.pixKeyType
        );
        
        setWithdrawResult({
            orderId: result.orderId,
            status: result.status || 'PENDING'
        });
        setStep(3); // Success is now step 3
    } catch (err: any) {
        console.error("Withdraw Error:", err);
        setError(err.message || "Erro ao solicitar saque.");
        // Go back to input if it's a data error
        if (err.message.includes("inválido") || err.message.includes("saldo")) {
             setStep(1);
        }
    } finally {
        setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
      if (pixResult?.qrCode) {
          navigator.clipboard.writeText(pixResult.qrCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const getKeyPlaceholder = (type: string) => {
      switch(type) {
          case 'CPF': return '000.000.000-00';
          case 'CNPJ': return '00.000.000/0000-00';
          case 'EMAIL': return 'exemplo@email.com';
          case 'PHONE': return '(00) 90000-0000';
          case 'EVP': return 'Chave aleatória';
          default: return 'Digite a chave Pix';
      }
  }

  const StepIndicator = () => {
    // Only show stepper for Withdraw flow
    if (mode === 'pix') return null;

    return (
      <div className="flex items-center justify-between px-4 lg:px-20 mb-10">
        {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${step === item ? 'bg-amber-500 border-amber-500 text-slate-900' : 
                step > item ? 'bg-green-500 border-green-500 text-white' : 
                'bg-white border-slate-200 text-slate-400'}
            `}>
                {step > item ? <Check className="w-5 h-5" /> : item}
            </div>
            {item < 3 && (
                <div className={`h-1 w-12 lg:w-32 mx-2 rounded-full ${step > item ? 'bg-green-500' : 'bg-slate-200'}`} />
            )}
            </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
           {mode === 'pix' 
            ? <><span className="font-bold">Depósito via Pix:</span> O valor será creditado automaticamente na sua carteira assim que o pagamento for confirmado.</>
            : <><span className="font-bold">Saque via Pix:</span> Transferência instantânea para sua conta bancária.</>
           }
        </p>
      </div>

      {/* Stepper */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        <StepIndicator />

        {/* Step 1: Inputs */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                {mode === 'pix' ? 'Gerar Cobrança Pix' : 'Realizar Saque'}
              </h2>
              <p className="text-slate-500 text-sm">
                {mode === 'pix' ? 'Gere um QR Code para receber pagamentos instantâneos' : 'Informe os dados para transferência'}
              </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Pix Key Input - ONLY FOR WITHDRAW */}
            {mode === 'withdraw' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Chave</label>
                    <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-900 cursor-pointer appearance-none"
                        value={formData.pixKeyType}
                        onChange={(e) => setFormData({...formData, pixKeyType: e.target.value})}
                    >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="PHONE">Telefone</option>
                        <option value="EVP">Chave Aleatória</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Chave PIX de Destino</label>
                    <input
                    type="text"
                    placeholder={getKeyPlaceholder(formData.pixKeyType)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-900"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({...formData, pixKey: e.target.value})}
                    />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-end mb-2">
                 <label className="block text-sm font-medium text-slate-700">Valor</label>
                 {mode === 'withdraw' && (
                     <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                         <Wallet className="w-3 h-3" />
                         Saldo Disponível: {loadingBalance ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBalance)}
                     </span>
                 )}
              </div>
              <input
                type="text"
                placeholder="R$ 0,00"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none text-slate-900 font-semibold text-lg transition-all ${error?.includes('Saldo') ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-amber-500 focus:border-amber-500'}`}
                value={formData.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  const fmt = (parseInt(val || '0') / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                  setFormData({...formData, amount: fmt})
                }}
              />
            </div>

            {mode === 'withdraw' && (
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição (opcional)</label>
                <textarea
                    rows={3}
                    placeholder="Ex: Pagamento de serviço"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-900 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
                <p className="text-right text-xs text-slate-400 mt-1">0/140 caracteres</p>
                </div>
            )}

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleNext}
                disabled={isLoading || !formData.amount || (mode === 'withdraw' && !formData.pixKey)}
                className="bg-amber-500 text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full lg:w-auto flex items-center justify-center shadow-lg shadow-amber-500/10"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === 'pix' ? 'Gerar QR Code' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation (Withdraw only) */}
        {step === 2 && mode === 'withdraw' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Confirmar dados do saque</h2>
              <p className="text-slate-500 text-sm">Revise os dados antes de prosseguir</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-100">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{user?.name || 'Usuário Mutual'}</p>
                <p className="text-sm text-slate-500">{user?.document ? `***.${user.document.slice(3,6)}.${user.document.slice(6,9)}-**` : 'Documento Oculto'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-100 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Origem</span>
                <p className="text-slate-900 font-medium">Carteira Mutual</p>
              </div>
              <div className="border border-slate-100 rounded-xl p-4">
                 <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Destino ({formData.pixKeyType})</span>
                 <p className="text-slate-900 font-medium break-all">{formData.pixKey}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-center">
               <p className="text-amber-700 text-sm font-medium mb-1">Valor a sacar</p>
               <h3 className="text-3xl font-bold text-amber-600">R$ {formData.amount}</h3>
            </div>

             <div className="flex gap-4 pt-4">
              <button 
                onClick={handleBack}
                className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                disabled={isLoading}
              >
                Voltar
              </button>
              <button 
                onClick={handleWithdrawSubmit}
                disabled={isLoading}
                className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Saque'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success / Result */}
        {step === 3 && (
          <div className="text-center animate-in fade-in zoom-in duration-500">
             
             {mode === 'withdraw' ? (
                 // WITHDRAW SUCCESS UI
                 <>
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-50">
                        <Check className="w-10 h-10 text-green-500" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Saque Solicitado!</h2>
                    <p className="text-slate-500 mb-8">Sua transferência será processada em instantes.</p>
                 </>
             ) : (
                 // PIX IN (QR CODE) UI
                 <>
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-amber-100">
                        <QrCode className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Cobrança Gerada</h2>
                    <p className="text-slate-500 mb-6">Escaneie o QR Code ou copie o código abaixo para pagar.</p>
                 </>
             )}

             <div className="bg-slate-50 rounded-xl border border-slate-100 p-6 max-w-md mx-auto text-left space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300"></div>
                
                <div className="text-center pb-4 border-b border-slate-200 border-dashed">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Valor</span>
                  <p className="text-3xl font-bold text-slate-900 mt-1">R$ {formData.amount}</p>
                </div>

                {/* QR Code Display for PIX IN */}
                {mode === 'pix' && pixResult && (
                    <div className="flex flex-col items-center justify-center py-4 gap-4">
                        {(pixResult.qrCodeImage || pixResult.qrCode) && (
                            <img 
                                src={pixResult.qrCodeImage || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixResult.qrCode)}`} 
                                alt="QR Code Pix" 
                                className="w-48 h-48 mix-blend-multiply" 
                            />
                        )}
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Pix Copia e Cola</label>
                            <div className="flex gap-2">
                                <input 
                                    readOnly 
                                    value={pixResult.qrCode} 
                                    className="flex-1 bg-white border border-slate-200 text-xs p-2 rounded text-slate-500 truncate"
                                />
                                <button 
                                    onClick={copyToClipboard}
                                    className="p-2 bg-amber-100 text-amber-600 rounded hover:bg-amber-200 transition-colors"
                                    title="Copiar"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Receipt Details for Withdraw */}
                {mode === 'withdraw' && (
                    <div className="space-y-3 pt-2">
                    <div>
                        <span className="text-xs text-slate-400 block">Beneficiário</span>
                        <p className="font-medium text-slate-900 text-sm">{formData.pixKey} <span className="text-xs text-slate-400">({formData.pixKeyType})</span></p>
                    </div>
                    {withdrawResult && (
                        <div>
                            <span className="text-xs text-slate-400 block">Status</span>
                            <p className="font-medium text-amber-600 text-sm">{withdrawResult.status}</p>
                        </div>
                    )}
                    </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-slate-200 border-dashed text-xs text-slate-500">
                   <span>ID do Pedido</span>
                   <span className="font-mono">
                       {mode === 'pix' && pixResult ? pixResult.orderId : 
                        mode === 'withdraw' && withdrawResult ? withdrawResult.orderId : 
                        Math.random().toString(36).substr(2, 9).toUpperCase()}
                   </span>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
               <button 
                  onClick={() => {
                      setStep(1);
                      setPixResult(null);
                      setWithdrawResult(null);
                      setFormData({ ...formData, amount: '', pixKey: '' });
                      // Re-fetch balance if needed
                      if (mode === 'withdraw' && user?.id) {
                          authService.getWalletBalance(user.id).then(bal => setCurrentBalance(bal));
                      }
                  }} 
                  className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
               >
                 {mode === 'pix' ? 'Gerar Outro' : 'Nova transação'}
               </button>
               {mode === 'withdraw' && (
                <button className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Compartilhar
                </button>
               )}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
