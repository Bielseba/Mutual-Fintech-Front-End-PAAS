
import React, { useState } from 'react';
import { Check, Copy, Terminal, Code2 } from 'lucide-react';

const CodeBlock = ({ language, code }: { language: string, code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-300 text-xs">
        <span className="font-mono font-semibold uppercase">{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-blue-100 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export const IntegrationDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'node' | 'curl' | 'python'>('node');

  const snippets = {
    node: `const axios = require('axios');

const createPix = async () => {
  try {
    const response = await axios.post('https://api.mutualgateway.com/v1/pix', {
      amount: 100.50,
      customer: {
        name: "João Silva",
        document: "123.456.789-00"
      }
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Pix Copy & Paste:', response.data.qrcode);
  } catch (error) {
    console.error(error);
  }
};

createPix();`,
    python: `import requests

url = "https://api.mutualgateway.com/v1/pix"

payload = {
    "amount": 100.50,
    "customer": {
        "name": "João Silva",
        "document": "123.456.789-00"
    }
}
headers = {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())`,
    curl: `curl --request POST \\
  --url https://api.mutualgateway.com/v1/pix \\
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  --header 'Content-Type: application/json' \\
  --data '{
	"amount": 100.50,
	"customer": {
		"name": "João Silva",
		"document": "123.456.789-00"
	}
}'`
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 lg:p-8 text-white shadow-lg">
        <h1 className="text-2xl lg:text-3xl font-bold mb-4">Guia de Integração Rápida</h1>
        <p className="text-blue-100 text-base lg:text-lg">Comece a processar pagamentos Pix em menos de 5 minutos com nossa API RESTful.</p>
      </div>

      <div className="grid gap-6 lg:gap-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Terminal className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">1. Autenticação</h2>
          </div>
          <p className="text-slate-600 mb-4 text-sm lg:text-base">
            Todas as requisições devem ser autenticadas usando o padrão Bearer Token. Obtenha suas credenciais na aba <span className="font-semibold text-slate-900">Configurações</span>.
          </p>
        </section>

        <section>
           <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <Code2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">2. Criar Cobrança Pix</h2>
          </div>
          <p className="text-slate-600 mb-6 text-sm lg:text-base">
            Use o endpoint <code className="bg-slate-100 px-2 py-1 rounded text-pink-600 text-sm">POST /v1/pix</code> para gerar um QR Code dinâmico.
          </p>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-4 overflow-x-auto">
              <div className="flex gap-6 min-w-max">
                {(['node', 'python', 'curl'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveTab(lang)}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === lang
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lang === 'node' ? 'Node.js' : lang}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-b-xl">
              <CodeBlock language={activeTab} code={snippets[activeTab]} />
            </div>
          </div>
        </section>

        <section className="bg-amber-50 border border-amber-100 rounded-xl p-6">
            <h3 className="font-bold text-amber-800 mb-2">Dica Pro</h3>
            <p className="text-amber-700 text-sm">
                Utilize o Webhook para receber notificações em tempo real sobre o status dos pagamentos. 
                Configure sua URL de callback na seção de Configurações.
            </p>
        </section>
      </div>
    </div>
  );
};
