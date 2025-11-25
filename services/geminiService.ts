import { GoogleGenAI } from "@google/genai";

/**
 * Gemini Client (frontend safe)
 * - Usa import.meta.env no Vite
 * - Evita crash se API key estiver ausente
 */

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

Responda de forma concisa, profissional e em Português do Brasil. 
Se o usuário perguntar sobre código, forneça exemplos em Node.js ou cURL.
`;

// --- IMPORTANTÍSSIMO: FRONT-END NÃO PODE USAR process.env --- //
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Client seguro — só cria se tiver key
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn("⚠ VITE_GEMINI_API_KEY ausente — ChatBot desativado.");
}

export const sendMessageToGemini = async (
  message: string,
  history: { role: "user" | "model"; text: string }[]
): Promise<string> => {
  try {
    if (!ai) {
      return "⚠ O assistente está temporariamente offline (API Key ausente).";
    }

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage({ message });
    return result.text ?? "Sem resposta.";
  } catch (error) {
    console.error("❌ Erro no Gemini:", error);
    return "❌ Estou enfrentando dificuldades técnicas agora. Tente novamente em instantes.";
  }
};
