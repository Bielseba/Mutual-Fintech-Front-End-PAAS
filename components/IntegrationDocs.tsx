import React, { useState } from 'react';
import { Check, Copy, Terminal, Code2, Book, Key, ArrowDownCircle, ArrowUpCircle, Webhook, AlertCircle, FileCode, Database, Info } from 'lucide-react';

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

const Table = ({ headers, rows }: { headers: string[], rows: string[][] }) => {
  return (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-50">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3 text-sm text-slate-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

type DocSection = 
  | 'introducao'
  | 'base-url'
  | 'autenticacao'
  | 'pix-in'
  | 'pix-out'
  | 'webhook'
  | 'codigos-erro'
  | 'exemplos'
  | 'outras-rotas'
  | 'status';

export const IntegrationDocs: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('introducao');
  const [codeLanguage, setCodeLanguage] = useState<'node' | 'curl' | 'python'>('node');

  const sections: { id: DocSection; label: string; iconColor: string; IconComponent: React.ComponentType<{ className?: string }> }[] = [
    { id: 'introducao', label: 'Introdução', iconColor: 'text-blue-600', IconComponent: Book },
    { id: 'base-url', label: 'Base URL', iconColor: 'text-indigo-600', IconComponent: Terminal },
    { id: 'autenticacao', label: 'Autenticação', iconColor: 'text-amber-600', IconComponent: Key },
    { id: 'pix-in', label: 'PIX IN', iconColor: 'text-green-600', IconComponent: ArrowDownCircle },
    { id: 'pix-out', label: 'PIX OUT', iconColor: 'text-red-600', IconComponent: ArrowUpCircle },
    { id: 'webhook', label: 'Webhook', iconColor: 'text-purple-600', IconComponent: Webhook },
    { id: 'codigos-erro', label: 'Códigos de Erro', iconColor: 'text-orange-600', IconComponent: AlertCircle },
    { id: 'exemplos', label: 'Exemplos', iconColor: 'text-cyan-600', IconComponent: FileCode },
    { id: 'outras-rotas', label: 'Outras Rotas', iconColor: 'text-slate-600', IconComponent: Database },
    { id: 'status', label: 'Status', iconColor: 'text-blue-500', IconComponent: Info },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'introducao':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Introdução</h2>
              <p className="text-slate-600 mb-4">
                Esta documentação descreve como integrar com a API do <strong>Mutual Fintech User Service</strong> para realizar operações de PIX (depósito e saque), gerenciar carteiras e receber notificações via webhook.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Recursos Principais</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>✅ Depósito via PIX (PIX IN)</li>
                <li>✅ Saque via PIX (PIX OUT)</li>
                <li>✅ Consulta de saldo</li>
                <li>✅ Extrato de transações (ledger)</li>
                <li>✅ Webhook para notificações de pagamento</li>
                <li>✅ Autenticação via App ID e Client ID</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Formato de Resposta</h3>
              <p className="text-slate-600 mb-4">
                Todas as respostas da API seguem o formato JSON padrão:
              </p>
              <CodeBlock
                language="json"
                code={`{
  "ok": true,
  "data": { ... },
  "error": null
}`}
              />
            </div>
          </div>
        );

      case 'base-url':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Base URL</h2>
            
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Produção</h3>
              <CodeBlock
                language="text"
                code="https://api.ominigateway.com.br"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Desenvolvimento (Local)</h3>
              <CodeBlock
                language="text"
                code="http://localhost:4000"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Documentação Swagger Interativa</h3>
              <CodeBlock
                language="text"
                code="https://api.ominigateway.com.br/docs"
              />
            </div>
          </div>
        );

      case 'autenticacao':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Autenticação</h2>
            
            <div>
              <p className="text-slate-600 mb-4">
                A API utiliza dois métodos de autenticação:
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">1. Headers de Autenticação (App ID e Client ID)</h3>
              <p className="text-slate-600 mb-4">
                Para as rotas de PIX, é necessário enviar os seguintes headers em todas as requisições:
              </p>
              <Table
                headers={['Header', 'Tipo', 'Obrigatório', 'Descrição']}
                rows={[
                  ['app_id', 'string', 'Sim', 'Identificador da aplicação do cliente'],
                  ['client_id', 'string', 'Sim', 'Identificador do cliente'],
                ]}
              />
              <p className="text-slate-600 mb-4 text-sm">
                <strong>Nota:</strong> Os headers podem ser enviados em diferentes formatos (kebab-case, snake_case, camelCase):
                <code className="bg-slate-100 px-2 py-1 rounded text-sm ml-2">app_id</code>, 
                <code className="bg-slate-100 px-2 py-1 rounded text-sm ml-1">app-id</code>, 
                <code className="bg-slate-100 px-2 py-1 rounded text-sm ml-1">App_id</code>, 
                <code className="bg-slate-100 px-2 py-1 rounded text-sm ml-1">App-Id</code>
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">2. Autenticação JWT (Opcional)</h3>
              <p className="text-slate-600 mb-4">
                Algumas rotas podem exigir autenticação JWT no header <code className="bg-slate-100 px-2 py-1 rounded text-sm">Authorization</code>:
              </p>
              <CodeBlock
                language="text"
                code="Authorization: Bearer <seu_token_jwt>"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Requisição</h3>
              <CodeBlock
                language="bash"
                code={`curl -X POST https://api.ominigateway.com.br/api/wallet/deposit/pix \\
  -H "Content-Type: application/json" \\
  -H "app_id: mg_live_892384923849238" \\
  -H "client_id: sk_live_1234567890abcdef" \\
  -d '{
    "amount": 100.00,
    "userId": 3
  }'`}
              />
            </div>
          </div>
        );

      case 'pix-in':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">PIX IN (Depósito)</h2>
            <p className="text-slate-600 mb-4">
              A rota de <strong>PIX IN</strong> permite criar uma cobrança PIX para que o usuário realize um depósito em sua carteira.
            </p>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Endpoint</h3>
              <CodeBlock
                language="text"
                code="POST /api/wallet/deposit/pix"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Headers Obrigatórios</h3>
              <Table
                headers={['Header', 'Tipo', 'Descrição']}
                rows={[
                  ['app_id', 'string', 'App ID do cliente'],
                  ['client_id', 'string', 'Client ID do cliente'],
                  ['Content-Type', 'string', 'application/json'],
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Body da Requisição</h3>
              <Table
                headers={['Campo', 'Tipo', 'Obrigatório', 'Descrição']}
                rows={[
                  ['amount', 'number', 'Sim', 'Valor do depósito em BRL (deve ser maior que zero)'],
                  ['userId', 'integer', 'Sim', 'ID do usuário que receberá o depósito'],
                  ['payerName', 'string', 'Não', 'Nome do pagador'],
                  ['payerCPF', 'string', 'Não', 'CPF do pagador (apenas números)'],
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Requisição</h3>
              <div className="border-b border-slate-200 mb-4">
                <div className="flex gap-4">
                  {(['node', 'python', 'curl'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                        codeLanguage === lang
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {lang === 'node' ? 'Node.js' : lang}
                    </button>
                  ))}
                </div>
              </div>
              {codeLanguage === 'node' && (
                <CodeBlock
                  language="javascript"
                  code={`const axios = require('axios');

const response = await axios.post(
  'https://api.ominigateway.com.br/api/wallet/deposit/pix',
  {
    amount: 100.00,
    userId: 3,
    payerName: 'João da Silva',
    payerCPF: '12345678900'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'app_id': 'mg_live_892384923849238',
      'client_id': 'sk_live_1234567890abcdef'
    }
  }
);

console.log('QR Code:', response.data.pix.qrcode);`}
                />
              )}
              {codeLanguage === 'python' && (
                <CodeBlock
                  language="python"
                  code={`import requests

url = 'https://api.ominigateway.com.br/api/wallet/deposit/pix'
headers = {
    'Content-Type': 'application/json',
    'app_id': 'mg_live_892384923849238',
    'client_id': 'sk_live_1234567890abcdef'
}
payload = {
    'amount': 100.00,
    'userId': 3,
    'payerName': 'João da Silva',
    'payerCPF': '12345678900'
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
                />
              )}
              {codeLanguage === 'curl' && (
                <CodeBlock
                  language="bash"
                  code={`curl -X POST https://api.ominigateway.com.br/api/wallet/deposit/pix \\
  -H "Content-Type: application/json" \\
  -H "app_id: mg_live_892384923849238" \\
  -H "client_id: sk_live_1234567890abcdef" \\
  -d '{
    "amount": 100.00,
    "userId": 3,
    "payerName": "João da Silva",
    "payerCPF": "12345678900"
  }'`}
                />
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Resposta (Sucesso - 200)</h3>
              <CodeBlock
                language="json"
                code={`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100.0,
  "status": "waiting_payment",
  "pix": {
    "qrcode": "00020126360014BR.GOV.BCB.PIX...",
    "expirationDate": "2024-01-15T10:50:00-03:00"
  },
  "fee": {
    "fixedAmount": 3,
    "spreadPercentage": 3,
    "estimatedFee": 6,
    "netAmount": 94.0
  }
}`}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Campos Importantes da Resposta</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li><strong>pix.qrcode</strong>: String do QR Code PIX para exibição ou geração de imagem</li>
                <li><strong>pix.expirationDate</strong>: Data de expiração do QR Code (geralmente 20 minutos)</li>
                <li><strong>status</strong>: Status do pagamento (waiting_payment, paid, refused, etc.)</li>
                <li><strong>fee</strong>: Informações sobre taxas aplicadas (3% de spread + R$ 3,00 fixo)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Códigos de Resposta</h3>
              <Table
                headers={['Código', 'Descrição']}
                rows={[
                  ['200', 'Cobrança PIX criada com sucesso'],
                  ['400', 'Erro de validação (campos obrigatórios faltando ou inválidos)'],
                  ['500', 'Erro interno ao criar cobrança'],
                ]}
              />
            </div>
          </div>
        );

      case 'pix-out':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">PIX OUT (Saque)</h2>
            <p className="text-slate-600 mb-4">
              A rota de <strong>PIX OUT</strong> permite realizar um saque via PIX da carteira do usuário para uma conta bancária.
            </p>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Endpoint</h3>
              <CodeBlock
                language="text"
                code="POST /api/wallet/withdraw/pix"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Body da Requisição</h3>
              <Table
                headers={['Campo', 'Tipo', 'Obrigatório', 'Descrição']}
                rows={[
                  ['userId', 'integer', 'Sim', 'ID do usuário que realizará o saque'],
                  ['amount', 'number', 'Sim', 'Valor do saque em BRL (deve ser maior que zero)'],
                  ['key', 'string', 'Sim', 'Chave PIX de destino (CPF, e-mail, telefone ou chave aleatória)'],
                  ['keyType', 'string', 'Sim', 'Tipo da chave PIX: CPF, EMAIL, PHONE, EVP'],
                  ['bankCode', 'string', 'Sim', 'Código do banco (ISPB ou COMPE)'],
                  ['holder', 'object', 'Não', 'Dados do titular da conta de destino'],
                  ['orderId', 'string', 'Não', 'Identificador único do saque'],
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Tipos de Chave PIX (keyType)</h3>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li><strong>CPF</strong>: Chave PIX utilizando CPF (apenas números)</li>
                <li><strong>EMAIL</strong>: Chave PIX utilizando e-mail</li>
                <li><strong>PHONE</strong>: Chave PIX utilizando telefone (formato: +5511999999999)</li>
                <li><strong>EVP</strong>: Chave PIX aleatória (chave aleatória do banco)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Requisição</h3>
              <div className="border-b border-slate-200 mb-4">
                <div className="flex gap-4">
                  {(['node', 'python', 'curl'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                        codeLanguage === lang
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {lang === 'node' ? 'Node.js' : lang}
                    </button>
                  ))}
                </div>
              </div>
              {codeLanguage === 'node' && (
                <CodeBlock
                  language="javascript"
                  code={`const axios = require('axios');

const response = await axios.post(
  'https://api.ominigateway.com.br/api/wallet/withdraw/pix',
  {
    userId: 3,
    amount: 30.0,
    key: '44775859806',
    keyType: 'CPF',
    bankCode: '237',
    holder: {
      name: 'João da Silva',
      document: '44775859806'
    }
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'app_id': 'mg_live_892384923849238',
      'client_id': 'sk_live_1234567890abcdef'
    }
  }
);

console.log('Saque criado:', response.data);`}
                />
              )}
              {codeLanguage === 'python' && (
                <CodeBlock
                  language="python"
                  code={`import requests

url = 'https://api.ominigateway.com.br/api/wallet/withdraw/pix'
headers = {
    'Content-Type': 'application/json',
    'app_id': 'mg_live_892384923849238',
    'client_id': 'sk_live_1234567890abcdef'
}
payload = {
    'userId': 3,
    'amount': 30.0,
    'key': '44775859806',
    'keyType': 'CPF',
    'bankCode': '237',
    'holder': {
        'name': 'João da Silva',
        'document': '44775859806'
    }
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
                />
              )}
              {codeLanguage === 'curl' && (
                <CodeBlock
                  language="bash"
                  code={`curl -X POST https://api.ominigateway.com.br/api/wallet/withdraw/pix \\
  -H "Content-Type: application/json" \\
  -H "app_id: mg_live_892384923849238" \\
  -H "client_id: sk_live_1234567890abcdef" \\
  -d '{
    "userId": 3,
    "amount": 30.0,
    "key": "44775859806",
    "keyType": "CPF",
    "bankCode": "237",
    "holder": {
      "name": "João da Silva",
      "document": "44775859806"
    }
  }'`}
                />
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Resposta (Sucesso - 200)</h3>
              <CodeBlock
                language="json"
                code={`{
  "ok": true,
  "orderId": "withdraw-3-1732470000000",
  "status": "pending",
  "amount": 30.0,
  "userId": 3,
  "message": "Saque processado com sucesso"
}`}
              />
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Webhook de Callback</h2>
            <p className="text-slate-600 mb-4">
              O webhook é um endpoint que recebe notificações do gateway de pagamentos quando há mudanças no status de transações PIX (depósitos ou saques).
            </p>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Endpoint</h3>
              <CodeBlock
                language="text"
                code="POST /api/wallet/webhook"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Body da Requisição (Payload do Webhook)</h3>
              <Table
                headers={['Campo', 'Tipo', 'Obrigatório', 'Descrição']}
                rows={[
                  ['merOrderNo', 'string', 'Sim', 'Número do pedido do merchant'],
                  ['orderNo', 'string', 'Sim', 'Número do pedido do gateway/provedor'],
                  ['status', 'string', 'Não', 'Status: SUCCESS, FAILED, PENDING'],
                  ['amount', 'number', 'Não', 'Valor da transação em BRL'],
                  ['userId', 'integer', 'Não', 'ID do usuário relacionado'],
                  ['type', 'string', 'Não', 'Tipo: DEPOSIT ou WITHDRAW'],
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Payload - Depósito Concluído</h3>
              <CodeBlock
                language="json"
                code={`{
  "merOrderNo": "user-3-1732470000000",
  "orderNo": "ch_GnOkRWjS0cN06P29",
  "status": "SUCCESS",
  "amount": 100.0,
  "userId": 3,
  "type": "DEPOSIT"
}`}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo de Payload - Saque Concluído</h3>
              <CodeBlock
                language="json"
                code={`{
  "merOrderNo": "withdraw-3-1732470000000",
  "orderNo": "payout_abc123xyz",
  "status": "SUCCESS",
  "amount": 30.0,
  "userId": 3,
  "type": "WITHDRAW"
}`}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Comportamento do Webhook</h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-600">
                <li><strong>Validação</strong>: O webhook valida se merOrderNo e orderNo estão presentes</li>
                <li><strong>Processamento de Depósito</strong> (type: "DEPOSIT"): Se status: "SUCCESS", o valor é creditado na carteira</li>
                <li><strong>Processamento de Saque</strong> (type: "WITHDRAW"): Se status: "SUCCESS", o valor é debitado da carteira</li>
                <li><strong>Ignorado</strong>: Se userId não for fornecido ou for inválido, o webhook retorna sucesso mas não processa</li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-bold text-amber-800 mb-2">⚠️ Segurança do Webhook</h3>
              <p className="text-amber-700 text-sm mb-3">
                <strong>IMPORTANTE:</strong> Em produção, implemente validação adicional:
              </p>
              <ul className="list-disc list-inside space-y-1 text-amber-700 text-sm">
                <li>Verificar origem: Validar que a requisição vem do gateway autorizado</li>
                <li>Assinatura: Validar assinatura/certificado do payload se disponível</li>
                <li>Idempotência: Processar apenas uma vez cada orderNo (evitar duplicação)</li>
                <li>Rate Limiting: Implementar limite de requisições por IP</li>
              </ul>
            </div>
          </div>
        );

      case 'codigos-erro':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Códigos de Erro</h2>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Erros Comuns</h3>
              <Table
                headers={['Código de Erro', 'Código HTTP', 'Descrição']}
                rows={[
                  ['MissingAppId', '400', 'O header app_id não foi enviado'],
                  ['MissingClientId', '400', 'O header client_id não foi enviado'],
                  ['InvalidAmount', '400', 'O valor informado é inválido ou menor/igual a zero'],
                  ['InvalidUserId', '400', 'O userId informado é inválido ou não é um número positivo'],
                  ['MissingUserId', '400', 'O userId não foi informado'],
                  ['MissingPixData', '400', 'Campos obrigatórios do PIX estão faltando'],
                  ['ValidationError', '400', 'Erro de validação de dados'],
                  ['UserNotFound', '404', 'Usuário não encontrado'],
                  ['GatewayPixDepositFailed', '502', 'Falha ao criar cobrança PIX no gateway'],
                  ['GatewayPixWithdrawFailed', '502', 'Falha ao processar saque PIX no gateway'],
                  ['WebhookProcessingFailed', '500', 'Falha ao processar webhook'],
                  ['MissingOperatorSecret', '500', 'Configuração de ambiente faltando'],
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Estrutura de Resposta de Erro</h3>
              <CodeBlock
                language="json"
                code={`{
  "ok": false,
  "error": "ErrorCode",
  "message": "Descrição amigável do erro",
  "details": {
    // Detalhes adicionais do erro (opcional)
  }
}`}
              />
            </div>
          </div>
        );

      case 'exemplos':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Exemplos de Integração</h2>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Exemplo Completo em JavaScript (Node.js)</h3>
              <div className="border-b border-slate-200 mb-4">
                <div className="flex gap-4">
                  {(['node', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLanguage(lang)}
                      className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                        codeLanguage === lang
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {lang === 'node' ? 'Node.js' : lang}
                    </button>
                  ))}
                </div>
              </div>
              {codeLanguage === 'node' && (
                <CodeBlock
                  language="javascript"
                  code={`const axios = require('axios');

const BASE_URL = 'https://api.ominigateway.com.br';
const APP_ID = 'mg_live_892384923849238';
const CLIENT_ID = 'sk_live_1234567890abcdef';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'app_id': APP_ID,
    'client_id': CLIENT_ID
  }
});

// 1. Criar depósito PIX
async function criarDepositoPix(userId, amount, payerName, payerCPF) {
  try {
    const response = await apiClient.post('/api/wallet/deposit/pix', {
      userId,
      amount,
      payerName,
      payerCPF
    });
    
    console.log('Depósito criado:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar depósito:', error.response?.data || error.message);
    throw error;
  }
}

// 2. Criar saque PIX
async function criarSaquePix(userId, amount, key, keyType, bankCode) {
  try {
    const response = await apiClient.post('/api/wallet/withdraw/pix', {
      userId,
      amount,
      key,
      keyType,
      bankCode,
      holder: {
        name: 'João da Silva',
        document: '12345678900'
      }
    });
    
    console.log('Saque criado:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar saque:', error.response?.data || error.message);
    throw error;
  }
}

// 3. Consultar saldo
async function consultarSaldo(userId) {
  try {
    const response = await apiClient.get(\`/api/users/\${userId}/wallet\`);
    console.log('Saldo:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao consultar saldo:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
(async () => {
  const userId = 3;
  
  // Criar depósito de R$ 100,00
  const deposito = await criarDepositoPix(userId, 100.00, 'João da Silva', '12345678900');
  console.log('QR Code:', deposito.pix.qrcode);
  
  // Consultar saldo
  const saldo = await consultarSaldo(userId);
  
  // Criar saque de R$ 30,00
  await criarSaquePix(userId, 30.00, '44775859806', 'CPF', '237');
})();`}
                />
              )}
              {codeLanguage === 'python' && (
                <CodeBlock
                  language="python"
                  code={`import requests

BASE_URL = 'https://api.ominigateway.com.br'
APP_ID = 'mg_live_892384923849238'
CLIENT_ID = 'sk_live_1234567890abcdef'

headers = {
    'Content-Type': 'application/json',
    'app_id': APP_ID,
    'client_id': CLIENT_ID
}

# 1. Criar depósito PIX
def criar_deposito_pix(user_id, amount, payer_name=None, payer_cpf=None):
    url = f'{BASE_URL}/api/wallet/deposit/pix'
    payload = {
        'userId': user_id,
        'amount': amount
    }
    
    if payer_name:
        payload['payerName'] = payer_name
    if payer_cpf:
        payload['payerCPF'] = payer_cpf
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

# 2. Criar saque PIX
def criar_saque_pix(user_id, amount, key, key_type, bank_code):
    url = f'{BASE_URL}/api/wallet/withdraw/pix'
    payload = {
        'userId': user_id,
        'amount': amount,
        'key': key,
        'keyType': key_type,
        'bankCode': bank_code,
        'holder': {
            'name': 'João da Silva',
            'document': '12345678900'
        }
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

# 3. Consultar saldo
def consultar_saldo(user_id):
    url = f'{BASE_URL}/api/users/{user_id}/wallet'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

# Uso
if __name__ == '__main__':
    user_id = 3
    
    # Criar depósito de R$ 100,00
    deposito = criar_deposito_pix(user_id, 100.00, 'João da Silva', '12345678900')
    print(f'QR Code: {deposito["pix"]["qrcode"]}')
    
    # Consultar saldo
    saldo = consultar_saldo(user_id)
    print(f'Saldo atual: R$ {saldo["balance"]}')
    
    # Criar saque de R$ 30,00
    saque = criar_saque_pix(user_id, 30.00, '44775859806', 'CPF', '237')
    print(f'Saque criado: {saque}')`}
                />
              )}
            </div>
          </div>
        );

      case 'outras-rotas':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Outras Rotas Úteis</h2>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Consultar Saldo da Carteira</h3>
              <CodeBlock
                language="text"
                code="GET /api/users/{userId}/wallet"
              />
              <CodeBlock
                language="bash"
                code="curl -X GET https://api.ominigateway.com.br/api/users/3/wallet"
              />
              <CodeBlock
                language="json"
                code={`{
  "ok": true,
  "walletId": 1,
  "balance": 100.50
}`}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Consultar Extrato (Ledger)</h3>
              <CodeBlock
                language="text"
                code="GET /api/users/{userId}/wallet/ledger"
              />
              <CodeBlock
                language="bash"
                code="curl -X GET https://api.ominigateway.com.br/api/users/3/wallet/ledger"
              />
              <CodeBlock
                language="json"
                code={`{
  "ok": true,
  "walletId": 1,
  "balance": 100.50,
  "ledger": [
    {
      "id": 1,
      "direction": "CREDIT",
      "amount": 100.00,
      "description": "PIX IN ch_GnOkRWjS0cN06P29",
      "meta": {
        "merOrderNo": "user-3-1732470000000",
        "orderNo": "ch_GnOkRWjS0cN06P29",
        "provider": "GATEWAY",
        "type": "PIX_DEPOSIT"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}`}
              />
            </div>
          </div>
        );

      case 'status':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Status de Transações PIX</h2>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Status de Depósito (PIX IN)</h3>
              <Table
                headers={['Status', 'Descrição']}
                rows={[
                  ['waiting_payment', 'Aguardando pagamento'],
                  ['paid', 'Pagamento confirmado'],
                  ['refused', 'Pagamento recusado'],
                  ['canceled', 'Pagamento cancelado'],
                  ['expired', 'QR Code expirado'],
                ]}
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">Status de Saque (PIX OUT)</h3>
              <Table
                headers={['Status', 'Descrição']}
                rows={[
                  ['pending', 'Saque pendente de processamento'],
                  ['processing', 'Saque sendo processado'],
                  ['SUCCESS', 'Saque realizado com sucesso'],
                  ['FAILED', 'Saque falhou'],
                  ['reversed', 'Saque estornado'],
                ]}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 lg:p-8 text-white shadow-lg">
        <h1 className="text-2xl lg:text-3xl font-bold mb-4">Guia de Integração Rápida</h1>
        <p className="text-blue-100 text-base lg:text-lg">
          Comece a processar pagamentos Pix em menos de 5 minutos com nossa API RESTful.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex gap-1 p-2 overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.IconComponent;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors rounded-lg ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : section.iconColor}`} />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-6 lg:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
