import { GoogleGenAI } from '@google/genai'

const apiKey =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' &&
    (process.env as any)?.API_KEY)

let client: GoogleGenAI | null = null

function getClient() {
  if (!apiKey) return null
  if (!client) client = new GoogleGenAI({ apiKey: String(apiKey) })
  return client
}

const SYSTEM_INSTRUCTION = `
Você é o assistente virtual oficial do 'Mutual Gateway', uma plataforma de pagamentos com foco em Pix.
Seu objetivo é ajudar desenvolvedores e comerciantes com a integração da API, dúvidas sobre transações e configurações.

Detalhes da API (Simulado para contexto):
- Base URL: https://api.mutualgateway.com/v1
- Autenticação: Header 'Authorization: Bearer <access_token>'
- Endpoints principais:
  - POST /transactions/pix (Gera QR Code)
  - GET /transactions/{id} (Verifica status)
  - POST /auth/token (Obtém token usando App ID e Secret)

Responda de forma concisa, profissional e em Português do Brasil. Se o usuário pedir código, responda em Node.js ou cURL.
`

type ChatTurn = {
  role: 'user' | 'model' | 'system'
  content: string
}

export async function sendMessageToGemini(
  message: string,
  history: ChatTurn[]
): Promise<string> {
  const c = getClient()
  if (!c) {
    return 'Chat do assistente indisponível no momento (API de IA não configurada).'
  }

  const model = c.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: SYSTEM_INSTRUCTION
  })

  const historyMessages = history
    .filter(m => m.role === 'user' || m.role === 'model')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))

  const chat = model.startChat({ history: historyMessages })

  const result = await chat.sendMessage(message)
  const response = await result.response
  const text = response.text()

  return text || 'Não consegui gerar uma resposta agora.'
}
