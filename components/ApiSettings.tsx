
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Copy, RefreshCw, Check, ShieldAlert, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

type Credentials = {
  appId: string;
  clientSecret: string;
  app_id?: string; // Defensive type definition
};

export const ApiSettings: React.FC = () => {
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://api.mutualpay.com/webhooks/pix');
  
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    const fetchCredentials = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const user = authService.getUser();
        if (!user || !user.id) {
          setError('Usuário não identificado. Tente fazer login novamente.');
          setIsLoading(false);
          return;
        }

        const data = await authService.getCredentials(user.id);
        setCredentials(data);
      } catch (err: any) {
        console.error('Error in component fetching credentials:', err);
        setError(err.message || 'Erro ao carregar credenciais.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredentials();
  }, []);

  const handleRotateCredentials = async () => {
    try {
      setRotating(true);
      setError(null);

      const user = authService.getUser();
      if (!user || !user.id) {
        setError('Usuário não identificado.');
        return;
      }

      if (typeof authService.rotateCredentials === 'function') {
        const data = await authService.rotateCredentials(user.id);
        setCredentials(data);
      } else {
        // Fallback: just refresh
        const data = await authService.getCredentials(user.id);
        setCredentials(data);
      }
    } catch (err: any) {
      console.error('Erro ao rotacionar credenciais:', err);
      setError(err.message || 'Erro ao rotacionar credenciais.');
    } finally {
      setRotating(false);
    }
  };

  const CredentialField = ({
    label,
    value,
    isSecret = false,
  }: {
    label: string;
    value: string;
    isSecret?: boolean;
  }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      if (!value) return;
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
        <div className="flex shadow-sm rounded-lg">
          <div className="relative flex-grow focus-within:z-10">
            <input
              type={isSecret && !showSecret ? 'password' : 'text'}
              className="block w-full rounded-l-lg border-slate-300 border py-3 pl-4 pr-10 text-slate-600 bg-slate-50 focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
              value={value || ''}
              readOnly
              disabled={!value}
            />
            {isSecret && value && (
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="relative -ml-px inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-r-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  };

  // Helper to safely get App ID
  const getAppId = (creds: Credentials) => {
    return creds.appId || creds.app_id || '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white shadow-sm rounded-xl border border-slate-100 p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          Credenciais de Produção
          {!isLoading && !error && credentials && (getAppId(credentials) || credentials.clientSecret) && (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
              Ativo
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500">Buscando suas chaves de API...</p>
          </div>
        ) : error ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Atenção</h3>
              <p className="text-sm text-amber-700 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {(!credentials || (!getAppId(credentials) && !credentials.clientSecret)) ? (
              <div className="text-center py-8">
                 <p className="text-sm text-slate-500 mb-4">
                  Suas credenciais ainda não foram geradas. Isso geralmente ocorre se sua conta ainda estiver em processo final de aprovação ou se é seu primeiro acesso.
                </p>
                <button
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    onClick={handleRotateCredentials}
                    disabled={rotating}
                >
                    {rotating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Gerar Credenciais Agora
                </button>
              </div>
            ) : (
              <>
                <CredentialField
                  label="App ID (Client ID)"
                  value={getAppId(credentials)}
                />
                <CredentialField
                  label="Client Secret"
                  value={credentials.clientSecret || ''}
                  isSecret
                />
              </>
            )}
          </>
        )}

        {credentials && (getAppId(credentials) || credentials.clientSecret) && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              className="flex items-center text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRotateCredentials}
              disabled={rotating || isLoading}
              type="button"
            >
              {rotating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Rotacionar Credenciais
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Atenção: Rotacionar as chaves invalidará imediatamente as credenciais atuais.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-100 p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Configuração de Webhook</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            URL de Callback
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="block w-full rounded-lg border-slate-300 border px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <p className="mt-2 text-sm text-slate-500">
            Enviaremos um POST com JSON sempre que o status de um Pix mudar.
          </p>
        </div>

        <div className="flex justify-end">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow">
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
