import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// NOTE: process.env.API_KEY is assumed to be injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

Responda de forma concisa, profissional e em Português do Brasil. Se o usuário perguntar sobre código, forneça exemplos em Node.js ou cURL.
`;

export const sendMessageToGemini = async (message: string, history: { role: 'user' | 'model'; text: string }[]): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Error querying Gemini:", error);
    return "Desculpe, estou enfrentando dificuldades técnicas no momento. Por favor, tente novamente mais tarde.";
  }
};