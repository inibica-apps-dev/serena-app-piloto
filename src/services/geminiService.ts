import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION } from "../constants";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Falta VITE_GEMINI_API_KEY en .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

// historial opcional
let chatHistory: any[] = [];

export const initChatSession = () => {
  chatHistory = [];
  console.log("Chat session initialized.");
};

export const sendMessageToGemini = async (text: string, image?: any) => {
  const parts: any[] = [];

  if (text) {
    parts.push({ text });
  }

  if (image) {
    parts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    });
  }

  // 💥💥💥 AQUI ESTA LA CLAVE: SYSTEM INSTRUCTION INCLUIDO 💥💥💥
  const request = {
    systemInstruction: SYSTEM_INSTRUCTION,   // ← Añadido correctamente
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  };

  const result = await model.generateContent(request);
  const response = result.response;

  return {
    text: response.text(),
  };
};