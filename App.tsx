
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Receipt, Code2, Settings, LogOut, Bell, Loader2, AlertCircle, CheckCircle, Building2, QrCode, Landmark, Menu, X, ChevronRight, User, Home, FileText, ArrowRightLeft, ShieldAlert, Trash2, Percent } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionHistory } from './components/TransactionHistory';
import { IntegrationDocs } from './components/IntegrationDocs';
import { ApiSettings } from './components/ApiSettings';
import { PixTransfer } from './components/PixTransfer';
import { MedManagement } from './components/MedManagement';
import { FeesPage } from './components/FeesPage';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { ViewState, User as UserType } from './types';
import { authService } from './services/authService';

// Omini Logo Component
const OminiLogo = ({ className }: { className?: string }) => (
  <img 
    src="https://i.postimg.cc/d1bgGj0x/Chat-GPT-Image-27-de-nov-de-2025-02-31-54.png" 
    alt="Omini API Logo" 
    className={`object-contain ${className}`} 
  />
);

// Premium Omini Loader
const OminiLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards">
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-indigo-500/30 blur-[60px] rounded-full animate-pulse"></div>
      <div className="relative w-32 h-32 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 backdrop-blur-2xl shadow-2xl">
         <OminiLogo className="w-20 h-20" />
      </div>
    </div>
    
    <div className="flex flex-col items-center gap-4">
       <h1 className="text-3xl font-bold text-white tracking-[0.2em] uppercase font-sans">Omini<span className="text-indigo-500">API</span></h1>
       <div className="w-56 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-indigo-500 w-full animate-progress-loading rounded-full origin-left"></div>
       </div>
       <p className="text-xs text-slate-500 font-medium uppercase tracking-widest animate-pulse">Inicializando Ambiente Seguro...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<ViewState>('login');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Maintenance Mode State
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('');
  
  // Notification State
  const [notifications, setNotifications] = useState<{id: number, text: string, time: string, read: boolean}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', document: '', cnpj: '', companyName: '', tradeName: '', partnerName: ''
  });

  const checkMaintenance = async () => {
     const status = await authService.getSystemStatus();
     if (status.maintenance) {
         setIsMaintenance(true);
         if (status.message) setMaintenanceMessage(status.message);
         return true;
     }
     setIsMaintenance(false);
     setMaintenanceMessage('');
     return false;
  };

  useEffect(() => {
    const initSystem = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate boot
        
        // Check maintenance first
        const maintenanceActive = await checkMaintenance();
        if (maintenanceActive) {
            setIsAppLoading(false);
            return;
        }

        const token = authService.getToken();
        const savedUser = authService.getUser();
        
        if (token && savedUser) {
          const status = savedUser.status;
          const docStatus = savedUser.doc_status || savedUser.docStatus;
          const isDocNotApproved = docStatus && String(docStatus).toUpperCase() !== 'APPROVED';

          if ((status && String(status).toUpperCase() === 'PENDING') || isDocNotApproved) {
            authService.logout();
            setIsLoggedIn(false);
          } else {
            setIsLoggedIn(true);
            setCurrentUser(savedUser);
            setView('dashboard');
          }
        }
        setIsAppLoading(false);
    };
    initSystem();
  }, []);

  // REAL Transaction Polling for Notifications
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || isMaintenance) return;

    // 1. Initial Fetch to set baseline (don't notify on past transactions)
    const fetchInitial = async () => {
        try {
            const ledger = await authService.getWalletLedger();
            if (ledger.length > 0) setLastTxId(ledger[0].id);
        } catch (e) {}
    };
    fetchInitial();

    // 2. Polling Interval (every 30s)
    const interval = setInterval(async () => {
        try {
            const ledger = await authService.getWalletLedger();
            if (ledger.length > 0) {
                const newest = ledger[0];
                // If we have a previous ID and the new one is different, it means a new tx came in
                if (lastTxId && newest.id !== lastTxId) {
                    const newNotif = {
                        id: Date.now(),
                        text: `${newest.type === 'CREDIT' ? 'Recebido' : 'Enviado'}: R$ ${Math.abs(newest.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        read: false
                    };
                    setNotifications(prev => [newNotif, ...prev]);
                    setLastTxId(newest.id);
                } else if (!lastTxId) {
                    setLastTxId(newest.id);
                }
            }
        } catch (e) {
            // silent error on background poll
        }
    }, 30000); // Check every 30s

    const handleClickOutside = (e: MouseEvent) => {
        // Only run click outside logic for Desktop dropdown
        if (window.innerWidth >= 1024 && notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        clearInterval(interval);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLoggedIn, currentUser?.id, lastTxId, isMaintenance]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClearNotifications = () => {
      setNotifications([]);
      setShowNotifications(false);
  };
  
  const handleMarkRead = () => {
      setNotifications(notifications.map(n => ({...n, read: true})));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (view === 'login') {
        const response = await authService.login({ email: formData.email, password: formData.password });
        if (response.user) {
           setCurrentUser(response.user);
           setIsLoggedIn(true);
           setView('dashboard');
        }
      } else if (view === 'register') {
        await authService.register({
          name: formData.name, email: formData.email, password: formData.password, personType,
          document: formData.document, cnpj: formData.cnpj, companyName: formData.companyName,
          tradeName: formData.tradeName, partnerName: formData.partnerName
        });
        setRegistrationSuccess(true);
      }
    } catch (err: any) {
      if (err.message === "MAINTENANCE_MODE") {
          setIsMaintenance(true);
          return;
      }
      const msg = err.message || 'Erro desconhecido.';
      if (msg.toLowerCase().includes('análise')) {
        setRegistrationSuccess(true);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setView('login');
  };

  if (isAppLoading) return <OminiLoader />;

  if (isMaintenance) {
      return <MaintenanceScreen onRetry={() => checkMaintenance()} message={maintenanceMessage} />;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col lg:flex-row font-sans selection:bg-indigo-500 selection:text-white">
        {/* Left Side - Visual */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 items-center justify-center">
            {/* Abstract Tech Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 text-center px-12">
                <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl backdrop-blur-xl">
                    <OminiLogo className="w-14 h-14" />
                </div>
                <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                    O Futuro da <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Infraestrutura Pix</span>
                </h1>
                <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                    API escalável, segura e amigável para a próxima geração de fintechs. Processe pagamentos em tempo real.
                </p>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-white lg:rounded-l-[3rem] shadow-2xl z-20">
            <div className="w-full max-w-[420px] space-y-8">
                {registrationSuccess ? (
                   <div className="text-center animate-fade-in">
                       <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                           <CheckCircle className="w-10 h-10 text-green-500" />
                       </div>
                       <h2 className="text-2xl font-bold text-slate-900 mb-2">
                           {view === 'register' ? 'Cadastro Recebido' : 'Acesso em Análise'}
                       </h2>
                       <p className="text-slate-500 mb-8">
                           Seus dados estão sendo processados pela nossa equipe de compliance. Aguarde a aprovação.
                       </p>
                       <button onClick={() => { setRegistrationSuccess(false); setView('login'); setError(null); }} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all">
                           Voltar ao Login
                       </button>
                   </div>
                ) : (
                    <>
                        <div className="lg:hidden text-center mb-8">
                            <OminiLogo className="w-12 h-12 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-slate-900">Omini API</h2>
                        </div>
                        
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">
                                {view === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
                            </h2>
                            <p className="text-slate-500">
                                {view === 'login' ? 'Acesse seu dashboard de gestão.' : 'Comece a processar pagamentos hoje.'}
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-3 border border-red-100">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {view === 'register' && (
                                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl mb-6">
                                    {['PF', 'PJ'].map(type => (
                                        <button key={type} type="button" onClick={() => setPersonType(type as any)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${personType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                            {type === 'PF' ? 'Pessoa Física' : 'Empresa'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {view === 'register' && (
                                <>
                                    <input name="name" placeholder="Nome Completo" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />
                                    {personType === 'PF' ? (
                                        <input name="document" placeholder="CPF" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />
                                    ) : (
                                        <>
                                            <input name="cnpj" placeholder="CNPJ" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />
                                            <input name="companyName" placeholder="Razão Social" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />
                                        </>
                                    )}
                                </>
                            )}

                            <input name="email" type="email" placeholder="E-mail Corporativo" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />
                            <input name="password" type="password" placeholder="Senha" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" required />

                            <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 flex justify-center items-center">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (view === 'login' ? 'Entrar' : 'Cadastrar')}
                            </button>
                        </form>

                        <div className="text-center">
                            <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(null); }} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium">
                                {view === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
                                <span className="text-indigo-600 font-bold">{view === 'login' ? 'Inscrever-se' : 'Fazer Login'}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
    );
  }

  // APP LAYOUT (DASHBOARD)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar - Desktop Only (Hidden on Mobile) */}
      <aside className={`hidden lg:flex fixed inset-y-0 left-0 z-50 w-[280px] bg-[#020617] text-white flex-col border-r border-white/5`}>
        <div className="h-24 flex items-center px-8 border-b border-white/5">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <OminiLogo className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-wide">Omini</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block -mt-1">API</span>
              </div>
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
            <nav className="space-y-1">
                <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={LayoutDashboard} label="Visão Geral" />
                <NavButton active={view === 'transactions'} onClick={() => setView('transactions')} icon={Receipt} label="Extrato" />
                <div className="my-4 h-px bg-white/5 mx-4"></div>
                <NavButton active={view === 'pix'} onClick={() => setView('pix')} icon={QrCode} label="Depositar (Pix In)" />
                <NavButton active={view === 'withdraw'} onClick={() => setView('withdraw')} icon={Landmark} label="Sacar (Pix Out)" />
                <NavButton active={view === 'med'} onClick={() => setView('med')} icon={ShieldAlert} label="Gestão MED" />
                <NavButton active={view === 'fees'} onClick={() => setView('fees')} icon={Percent} label="Tarifas" />
            </nav>

            <div>
                <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Desenvolvedor</p>
                <nav className="space-y-1">
                    <NavButton active={view === 'integration'} onClick={() => setView('integration')} icon={Code2} label="Documentação" />
                    <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Chaves API" />
                </nav>
            </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#0F172A]/50 backdrop-blur-sm">
           <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{currentUser?.name || 'Usuário'}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
                </div>
           </div>
           <button onClick={handleLogout} className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
             <LogOut className="w-3.5 h-3.5" /> Sair
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:pl-[280px]">
        {/* Header - Desktop Only */}
        <header className="hidden lg:flex h-20 px-10 items-center justify-between bg-white/80 backdrop-blur-xl border-b border-slate-100 z-40 sticky top-0">
            <div>
                <h1 className="text-xl font-bold text-slate-900">
                    {view === 'dashboard' && 'Visão Geral'}
                    {view === 'transactions' && 'Extrato Financeiro'}
                    {view === 'pix' && 'Depósito Pix'}
                    {view === 'withdraw' && 'Saque Pix'}
                    {view === 'med' && 'Gestão de Disputas (MED)'}
                    {view === 'fees' && 'Tarifas e Taxas'}
                    {view === 'integration' && 'Documentação'}
                    {view === 'settings' && 'Configurações'}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold uppercase tracking-wide">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Produção
                </div>
                
                {/* Notification Bell (Desktop) */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
                        )}
                    </button>
                    
                    {showNotifications && (
                        <div className="absolute right-0 top-14 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 animate-fade-in z-50 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-900 text-sm">Notificações</h3>
                                {notifications.length > 0 && (
                                    <button onClick={handleClearNotifications} className="text-[10px] text-slate-500 hover:text-red-500 flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" /> Limpar
                                    </button>
                                )}
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs">
                                        Nenhuma notificação nova.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {notifications.map((n) => (
                                            <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{n.text}</p>
                                                        <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <button onClick={handleMarkRead} className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-slate-50 border-t border-slate-100">
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden h-16 px-6 flex items-center justify-between bg-white border-b border-slate-100 z-40 sticky top-0">
             <div className="flex items-center gap-2">
                 <OminiLogo className="w-8 h-8" />
                 <span className="font-bold text-slate-900">Omini API</span>
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-500 relative">
                     <Bell className="w-5 h-5" />
                     {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
                 </button>
                 <button onClick={handleLogout} className="p-2 text-slate-500"><LogOut className="w-5 h-5" /></button>
             </div>
        </header>

        {/* Mobile Notification Drawer (Full Width Overlay) */}
        {showNotifications && (
            <div className="lg:hidden fixed inset-0 z-[60] flex flex-col">
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowNotifications(false)}></div>
                <div className="relative top-16 mx-4 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-900 text-sm">Notificações</h3>
                        {notifications.length > 0 && (
                            <button onClick={handleClearNotifications} className="text-[10px] text-slate-500 hover:text-red-500 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Limpar
                            </button>
                        )}
                        <button onClick={() => setShowNotifications(false)} className="p-1 bg-slate-200 rounded-full text-slate-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                Nenhuma notificação nova.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((n) => (
                                    <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{n.text}</p>
                                                <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <button onClick={handleMarkRead} className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-slate-50 border-t border-slate-100">
                            Marcar todas como lidas
                        </button>
                    )}
                </div>
            </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 scroll-smooth pb-24 lg:pb-10">
           <div className="max-w-7xl mx-auto animate-fade-in">
              {view === 'dashboard' && <Dashboard onNavigate={setView} />}
              {view === 'transactions' && <TransactionHistory />}
              {view === 'med' && <MedManagement />}
              {view === 'fees' && <FeesPage />}
              {view === 'integration' && <IntegrationDocs />}
              {view === 'settings' && <ApiSettings />}
              {(view === 'pix' || view === 'withdraw') && <PixTransfer mode={view} onBack={() => setView('dashboard')} />}
           </div>
        </main>

        {/* Mobile Bottom Navigation (iPhone Style) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 pb-safe">
            <MobileNavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={Home} label="Início" />
            <MobileNavBtn active={view === 'transactions'} onClick={() => setView('transactions')} icon={FileText} label="Extrato" />
            <div className="relative -top-5">
                 <button onClick={() => setView('pix')} className="w-14 h-14 bg-[#0F172A] rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-900/30 active:scale-95 transition-transform border-4 border-white">
                     <QrCode className="w-6 h-6" />
                 </button>
            </div>
            <MobileNavBtn active={view === 'withdraw'} onClick={() => setView('withdraw')} icon={ArrowRightLeft} label="Saque" />
            <MobileNavBtn active={view === 'settings'} onClick={() => setView('settings')} icon={Settings} label="Ajustes" />
        </nav>
      </div>

    </div>
  );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
  >
    <Icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} strokeWidth={2} />
    {label}
  </button>
);

const MobileNavBtn = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-12 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
