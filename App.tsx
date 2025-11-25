import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Receipt, Code2, Settings, LogOut, Menu, X, Bell, UserCircle, Loader2, AlertCircle, CheckCircle, Building2, User as UserIcon, Clock, ChevronRight, PieChart, CreditCard, ArrowLeftRight, Landmark, Link as LinkIcon, QrCode } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionHistory } from './components/TransactionHistory';
import { IntegrationDocs } from './components/IntegrationDocs';
import { ApiSettings } from './components/ApiSettings';
import { ChatBot } from './components/ChatBot';
import { PixTransfer } from './components/PixTransfer';
import { ViewState, User } from './types';
import { authService } from './services/authService';

// Custom Mutual Logo Component - Updated to use Image
const MutualLogo = ({ className, color }: { className?: string; color?: string }) => (
  <img 
    src="https://painel.mutualgames.app/public/assets/images/Favicon.png" 
    alt="Mutual Logo" 
    className={`object-contain ${className}`} 
  />
);

// Premium Loading Screen Component
const MutualLoader = () => (
  <div className="fixed inset-0 z-[100] bg-[#0F172A] flex flex-col items-center justify-center animate-out fade-out duration-700 fill-mode-forwards">
    <div className="relative mb-8">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
      
      {/* Logo Container */}
      <div className="relative w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-2xl animate-bounce-slight">
         <MutualLogo className="w-16 h-16" />
      </div>
    </div>
    
    <div className="flex flex-col items-center gap-3">
       <h1 className="text-2xl font-bold text-white tracking-widest uppercase">Mutual</h1>
       <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 w-full animate-progress-loading rounded-full origin-left"></div>
       </div>
       <p className="text-xs text-slate-500 font-medium mt-2 animate-pulse">Inicializando sistema seguro...</p>
    </div>

    {/* Footer */}
    <div className="absolute bottom-8 text-center">
       <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Fintech Solutions</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<ViewState>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initial App Loading State
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Auth Form State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Extended Form Data
  const [personType, setPersonType] = useState<'PF' | 'PJ'>('PF');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // PF Specific
    document: '', // CPF
    // PJ Specific
    cnpj: '',
    companyName: '', // Razão Social
    tradeName: '',   // Nome Fantasia
    partnerName: ''  // Sócio Responsável
  });

  useEffect(() => {
    // Simulate initial system check / boot
    const initSystem = async () => {
        // Minimum loading time for animation
        await new Promise(resolve => setTimeout(resolve, 2000));

        const token = authService.getToken();
        const savedUser = authService.getUser();
        
        if (token && savedUser) {
          // SECURITY CHECK: Check status on auto-login
          const status = savedUser.status;
          const docStatus = savedUser.doc_status || savedUser.docStatus;
          
          // Determine if user is Pending or Not Approved
          const isStatusPending = status && String(status).toUpperCase() === 'PENDING';
          const isDocStatusPending = docStatus && String(docStatus).toUpperCase() === 'PENDING';
          
          // Strict Rule: If doc_status exists, it MUST be APPROVED.
          const isDocNotApproved = docStatus && String(docStatus).toUpperCase() !== 'APPROVED';

          if (isStatusPending || isDocStatusPending || isDocNotApproved) {
            console.warn('Blocked user with non-APPROVED status from auto-login');
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

  // Input Masks
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove non-digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1'); // Limit length
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '') // Remove non-digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1'); // Limit length
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    const name = e.target.name;

    // Apply Masks
    if (name === 'document') {
      value = formatCPF(value);
    } else if (name === 'cnpj') {
      value = formatCNPJ(value);
    }

    setFormData({
      ...formData,
      [name]: value
    });
    if (error) setError(null);
  };

  const handleAuthSuccess = (data: any) => {
    const token = data.token || data.access_token;
    const user = data.user;

    if (token && user) {
      localStorage.setItem('mutual_token', token);
      localStorage.setItem('mutual_user', JSON.stringify(user));
      setCurrentUser(user);
      setIsLoggedIn(true);
      setView('dashboard');
    } else {
      throw new Error("Resposta do servidor incompleta (Token ou Usuário ausente).");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (view === 'login') {
        const response = await authService.login({
          email: formData.email,
          password: formData.password
        });
        handleAuthSuccess(response);

      } else if (view === 'register') {
        await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          personType: personType,
          document: formData.document,
          cnpj: formData.cnpj,
          companyName: formData.companyName,
          tradeName: formData.tradeName,
          partnerName: formData.partnerName
        });
        
        setRegistrationSuccess(true);
      }
    } catch (err: any) {
      const msg = err.message || 'Ocorreu um erro desconhecido.';
      
      // Check for the specific PENDING error from authService
      if (msg.toLowerCase().includes('cadastro em análise') || msg.toLowerCase().includes('análise')) {
        setRegistrationSuccess(true);
        return;
      }
      
      console.error("Auth Process Error:", err);

      if (msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('NetworkError')) {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
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
    setFormData({ 
        name: '', email: '', password: '', 
        document: '', cnpj: '', companyName: '', tradeName: '', partnerName: '' 
    });
  };

  // Modern Mobile Navbar with blur
  const MobileNavbar = () => (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-[#0F172A]/90 backdrop-blur-xl rounded-2xl px-6 py-4 z-50 flex justify-between items-center shadow-2xl border border-white/5">
      <button 
        onClick={() => setView('dashboard')}
        className={`flex flex-col items-center space-y-1 transition-all duration-300 ${view === 'dashboard' ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <LayoutDashboard className="w-5 h-5" strokeWidth={view === 'dashboard' ? 2.5 : 2} />
      </button>
      
      <button 
        onClick={() => setView('transactions')}
        className={`flex flex-col items-center space-y-1 transition-all duration-300 ${view === 'transactions' ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <Receipt className="w-5 h-5" strokeWidth={view === 'transactions' ? 2.5 : 2} />
      </button>

      <div className="w-px h-6 bg-white/10 mx-2"></div>

      <button 
        onClick={() => setView('pix')}
        className={`flex flex-col items-center space-y-1 transition-all duration-300 ${view === 'pix' ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <QrCode className="w-5 h-5" strokeWidth={view === 'pix' ? 2.5 : 2} />
      </button>

      <button 
        onClick={() => setView('settings')}
        className={`flex flex-col items-center space-y-1 transition-all duration-300 ${view === 'settings' ? 'text-amber-500 scale-110' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <Settings className="w-5 h-5" strokeWidth={view === 'settings' ? 2.5 : 2} />
      </button>
    </div>
  );

  // SHOW LOADER IF APP IS INITIALIZING
  if (isAppLoading) {
      return <MutualLoader />;
  }

  // Authentication Screens
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col lg:flex-row font-sans">
        {/* Left Side - Branding (Mutual Navy) */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#0F172A] relative overflow-hidden flex-col justify-between p-12 shrink-0">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/40 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-16">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                        <MutualLogo className="w-8 h-8" />
                    </div>
                    <span className="text-white font-semibold text-2xl tracking-wide">Mutual</span>
                </div>
                
                <h1 className="text-4xl lg:text-5xl font-bold text-white leading-[1.2] mb-6 tracking-tight">
                    Pagamentos Pix <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">simplificados</span> <br/>
                    para o seu negócio.
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                    Tecnologia financeira robusta com integração fácil, checkout transparente e gestão completa.
                </p>
            </div>

            <div className="relative z-10 flex items-center gap-6">
                <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#0F172A] flex items-center justify-center text-xs text-white">
                            <Building2 className="w-full h-full p-2 text-slate-400" />
                        </div>
                    ))}
                </div>
                <div>
                    <p className="text-white font-bold">5k+ Empresas</p>
                    <p className="text-slate-500 text-xs">Confiam na Mutual</p>
                </div>
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-16 overflow-y-auto">
            
            {registrationSuccess ? (
               <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
                 <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-amber-500" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {view === 'register' ? 'Cadastro Recebido' : 'Acesso em Análise'}
                 </h2>
                 <p className="text-slate-500 mb-8">
                    {view === 'register' ? 'Sua conta foi criada com sucesso.' : 'Estamos verificando seus dados.'}
                 </p>
                 
                 <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 text-left">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Status: EM ANÁLISE</h3>
                            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                                Para sua segurança, nossa equipe está validando sua documentação. Você será notificado por e-mail assim que o acesso for liberado.
                            </p>
                        </div>
                    </div>
                 </div>

                 <button 
                    onClick={() => {
                        setRegistrationSuccess(false);
                        setView('login');
                        setError(null);
                    }}
                    className="w-full py-3.5 bg-[#0F172A] text-white rounded-xl font-medium hover:bg-slate-800 transition-all"
                 >
                    Voltar para o Login
                 </button>
               </div>
            ) : (
                <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                     <div className="lg:hidden flex justify-center mb-6">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg">
                                <MutualLogo className="w-8 h-8" />
                            </div>
                            <span className="text-slate-900 font-semibold text-xl tracking-wide">Mutual</span>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                            {view === 'login' ? 'Portal do Parceiro' : 'Crie sua conta'}
                        </h2>
                        <p className="text-slate-500">
                            {view === 'login' ? 'Gerencie suas vendas e integrações.' : 'Comece a vender com Pix hoje mesmo.'}
                        </p>
                    </div>

                    {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">
                            <span className="font-semibold block mb-0.5">Erro de Autenticação</span>
                            {error}
                        </div>
                    </div>
                    )}

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {view === 'register' && (
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => setPersonType('PF')}
                                    className={`flex items-center justify-center py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        personType === 'PF' 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Pessoa Física
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPersonType('PJ')}
                                    className={`flex items-center justify-center py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        personType === 'PJ' 
                                        ? 'bg-white text-slate-900 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Empresa
                                </button>
                            </div>
                        )}

                        {view === 'register' && (
                            <div className="space-y-4 animate-in slide-in-from-left-4 fade-in">
                                {personType === 'PF' ? (
                                    <>
                                        <div>
                                            <input 
                                                name="name"
                                                type="text" 
                                                required={view === 'register'}
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                                placeholder="Nome Completo"
                                            />
                                        </div>
                                        <div>
                                            <input 
                                                name="document"
                                                type="text" 
                                                required={view === 'register'}
                                                value={formData.document}
                                                onChange={handleInputChange}
                                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                                placeholder="CPF (000.000.000-00)"
                                                maxLength={14}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input 
                                                name="cnpj"
                                                type="text" 
                                                required={view === 'register'}
                                                value={formData.cnpj}
                                                onChange={handleInputChange}
                                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                                placeholder="CNPJ"
                                                maxLength={18}
                                            />
                                            <input 
                                                name="companyName"
                                                type="text" 
                                                required={view === 'register'}
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                                placeholder="Razão Social"
                                            />
                                        </div>
                                        <input 
                                            name="tradeName"
                                            type="text" 
                                            value={formData.tradeName}
                                            onChange={handleInputChange}
                                            className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                            placeholder="Nome Fantasia (Opcional)"
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        <div>
                            <input 
                                name="email"
                                type="email" 
                                required 
                                value={formData.email}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                placeholder="E-mail Corporativo" 
                            />
                        </div>
                        <div>
                            <input 
                                name="password"
                                type="password" 
                                required 
                                value={formData.password}
                                onChange={handleInputChange}
                                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm" 
                                placeholder="Senha" 
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-amber-600/10 text-sm font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-slate-800" />
                                    Processando...
                                </>
                                ) : (
                                view === 'login' ? 'Acessar Painel' : 'Criar Conta Grátis'
                                )}
                            </button>
                        </div>

                        <div className="text-center pt-2">
                            <button 
                                type="button"
                                onClick={() => {
                                    setView(view === 'login' ? 'register' : 'login');
                                    setError(null);
                                }} 
                                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                {view === 'login' ? 'Novo por aqui? ' : 'Já possui cadastro? '}
                                <span className="text-amber-600 font-bold">{view === 'login' ? 'Começar agora' : 'Fazer login'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
    );
  }

  // APP LAYOUT (Merchant Dashboard)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      
      {/* Sidebar - Mutual Navy Style */}
      <aside 
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0F172A] flex-col border-r border-white/5 shadow-2xl"
      >
        <div className="h-24 flex items-center px-8 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                <MutualLogo className="w-7 h-7" />
              </div>
              <span className="text-white font-bold text-lg tracking-wide">Mutual</span>
          </div>
        </div>

        <div className="px-4 py-6 space-y-8 overflow-y-auto">
            <nav className="space-y-1.5">
                <div className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Vendas</div>
                <NavButton 
                    active={view === 'dashboard'} 
                    onClick={() => setView('dashboard')} 
                    icon={LayoutDashboard} 
                    label="Dashboard" 
                />
                <NavButton 
                    active={view === 'transactions'} 
                    onClick={() => setView('transactions')} 
                    icon={Receipt} 
                    label="Transações" 
                />
                 <NavButton 
                    active={view === 'withdraw'} 
                    onClick={() => setView('withdraw')} 
                    icon={Landmark} 
                    label="Saques" 
                />
            </nav>

            <nav className="space-y-1.5">
                <div className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Gateway</div>
                <NavButton 
                    active={view === 'pix'} 
                    onClick={() => setView('pix')} 
                    icon={QrCode} 
                    label="Área Pix" 
                />
            </nav>

            <nav className="space-y-1.5">
                <div className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sistema</div>
                <NavButton 
                    active={view === 'integration'} 
                    onClick={() => setView('integration')} 
                    icon={Code2} 
                    label="Desenvolvedores" 
                />
                <NavButton 
                    active={view === 'settings'} 
                    onClick={() => setView('settings')} 
                    icon={Settings} 
                    label="Configurações" 
                />
            </nav>
        </div>

        <div className="mt-auto p-6 bg-[#0B0F19] border-t border-white/5">
           <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-amber-500/50">
                    {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{currentUser?.name || 'Parceiro'}</p>
                    <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
                </div>
           </div>
           <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
           >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Encerrar Sessão
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px] transition-all duration-300">
        {/* Modern Header */}
        <header className="h-16 lg:h-20 sticky top-0 z-40 px-4 lg:px-10 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="flex items-center gap-4">
             <div className="lg:hidden">
                 <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center text-white font-bold">
                    <MutualLogo className="w-7 h-7" />
                 </div>
             </div>
             
             <div>
                <h1 className="text-base lg:text-lg font-bold text-slate-900 truncate max-w-[200px] lg:max-w-none">
                    {view === 'dashboard' ? 'Painel do Parceiro' : 
                     view === 'transactions' ? 'Extrato de Vendas' : 
                     view === 'integration' ? 'Documentação da API' : 
                     view === 'pix' ? 'Área Pix' :
                     view === 'withdraw' ? 'Solicitar Saque' :
                     'Configurações da Conta'}
                </h1>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                 <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                 <span className="text-xs font-semibold">Produção</span>
             </div>

             <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

             <button className="relative p-2 text-slate-400 hover:text-amber-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 pb-24 lg:pb-10">
           <div className="max-w-[1200px] mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {view === 'dashboard' && <Dashboard onNavigate={setView} />}
              {view === 'transactions' && <TransactionHistory />}
              {view === 'integration' && <IntegrationDocs />}
              {view === 'settings' && <ApiSettings />}
              {(view === 'pix' || view === 'withdraw') && (
                <PixTransfer 
                  mode={view} 
                  onBack={() => setView('dashboard')} 
                />
              )}
           </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <MobileNavbar />

      <ChatBot />
    </div>
  );
};

// Polished Nav Button
const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden
      ${active 
        ? 'text-slate-900 bg-amber-500 shadow-lg shadow-amber-500/20' 
        : 'text-slate-400 hover:text-white hover:bg-white/5'
      }
    `}
  >
    <Icon className={`w-4 h-4 mr-3 transition-colors ${active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-300'}`} />
    <span className="flex-1 text-left">{label}</span>
  </button>
);

export default App;