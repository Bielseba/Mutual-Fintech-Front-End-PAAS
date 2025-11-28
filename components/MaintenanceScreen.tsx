
import React, { useEffect, useState } from 'react';
import { Settings, RefreshCw, Server, ShieldCheck, Activity, Clock } from 'lucide-react';

interface MaintenanceScreenProps {
  onRetry: () => void;
  message?: string;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onRetry, message }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = () => {
    setIsChecking(true);
    // Simula tempo de check
    setTimeout(() => {
      setIsChecking(false);
      setRetryCount(prev => prev + 1);
      onRetry();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 max-w-2xl w-full">
        
        {/* Animated Icon Container */}
        <div className="flex justify-center mb-10 relative">
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Spinning Rings */}
            <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute inset-2 border-2 border-dashed border-indigo-400/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
            
            {/* Center Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.4)] backdrop-blur-sm relative z-10">
              <Settings className="w-10 h-10 text-white animate-[spin_4s_linear_infinite]" />
            </div>

            {/* Floating Badges */}
            <div className="absolute -right-8 top-0 bg-[#0F172A] border border-white/10 p-2 rounded-lg shadow-xl animate-bounce delay-700">
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="absolute -left-6 bottom-0 bg-[#0F172A] border border-white/10 p-2 rounded-lg shadow-xl animate-bounce delay-1000">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest animate-pulse">
              <Activity className="w-3 h-3" /> Manutenção Programada
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Estamos Melhorando <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                Nossa Infraestrutura
              </span>
            </h1>
          </div>

          <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
            {message || "O Omini API está passando por uma atualização crítica de segurança e performance. O acesso ao dashboard e API está temporariamente suspenso."}
          </p>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center">
               <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Status</span>
               <span className="text-amber-400 font-bold text-sm">Atualizando</span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center">
               <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Previsão</span>
               <span className="text-white font-bold text-sm flex items-center gap-1">
                 <Clock className="w-3 h-3" /> 30 min
               </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center">
               <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Integridade</span>
               <span className="text-emerald-400 font-bold text-sm">Segura</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-8">
            <button 
              onClick={handleRetry}
              disabled={isChecking}
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Verificando Conexão...
                </>
              ) : (
                <>
                  <RefreshCw className={`w-5 h-5 ${retryCount > 0 ? 'rotate-180 transition-transform duration-500' : ''}`} />
                  Tentar Reconectar
                </>
              )}
            </button>
            
            {retryCount > 2 && (
              <p className="mt-4 text-xs text-slate-500 animate-fade-in">
                Ainda em manutenção. Por favor, tente novamente em alguns minutos.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center border-t border-white/5 pt-8">
          <p className="text-xs text-slate-600">
            Dúvidas urgentes? Entre em contato via <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">suporte@ominigateway.com.br</a>
          </p>
          <p className="text-[10px] text-slate-700 mt-2">
            Reference ID: MAINT-{new Date().getFullYear()}-0X29
          </p>
        </div>

      </div>
    </div>
  );
};
