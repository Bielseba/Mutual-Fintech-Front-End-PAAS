
import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Wallet, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';
import { UserFees } from '../types';

export const FeesPage: React.FC = () => {
  const [fees, setFees] = useState<UserFees | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        console.log('[FeesPage] === INICIANDO BUSCA DE TAXAS ===');
        setIsLoading(true);
        setError(null);
        const data = await authService.getMyFees();
        console.log('[FeesPage] Dados retornados do serviço:', data);
        
        if (data) {
          console.log('[FeesPage] ✅ Taxas encontradas, atualizando estado:', data);
          setFees(data);
        } else {
          console.warn('[FeesPage] ⚠️ Nenhuma taxa retornada, usando valores padrão');
          // Se não houver taxas configuradas, usar valores padrão de 0
          const user = authService.getUser();
          const defaultFees = {
            userId: user?.id ? Number(user.id) : 0,
            pixInPercent: 0,
            pixOutPercent: 0
          };
          console.log('[FeesPage] Valores padrão definidos:', defaultFees);
          setFees(defaultFees);
        }
      } catch (e) {
        console.error('[FeesPage] ❌ Erro ao buscar taxas:', e);
        setError('Erro ao carregar taxas. Tente novamente mais tarde.');
        // Em caso de erro, usar valores padrão
        const user = authService.getUser();
        const errorFees = {
          userId: user?.id ? Number(user.id) : 0,
          pixInPercent: 0,
          pixOutPercent: 0
        };
        console.log('[FeesPage] Valores padrão por erro:', errorFees);
        setFees(errorFees);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFees();
  }, []);

  
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Pricing Model Info */}
      <div className="bg-[#0F172A] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-500/20">
                    <CheckCircle className="w-3 h-3" /> Modelo Pay-per-use
                </div>
                <h1 className="text-3xl font-bold mb-2">Tabela de Tarifas</h1>
                <p className="text-slate-400 max-w-lg">
                    Simplicidade para o seu negócio. Sem letras miúdas, sem surpresas no final do mês.
                </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center min-w-[150px]">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Custo Mensal</p>
                <p className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-2">
                    R$ 0,00
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Isento de mensalidade</p>
            </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Main Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Pix In */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Pix Entrada (Cash-in)</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-xs">Recebimento via QR Code estático ou dinâmico.</p>
              <div className="flex items-baseline gap-1 mt-auto">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  ) : (
                    <>
                        <span className="text-4xl font-bold text-slate-900">
                            {(fees?.pixInPercent ?? 0).toFixed(2)}%
                        </span>
                    </>
                  )}
              </div>
          </div>

          {/* Pix Out */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Pix Saída (Cash-out)</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-xs">Transferências para outras contas e chaves Pix.</p>
              <div className="flex items-baseline gap-1 mt-auto">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  ) : (
                    <>
                        <span className="text-4xl font-bold text-slate-900">
                            {(fees?.pixOutPercent ?? 0).toFixed(2)}%
                        </span>
                    </>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
