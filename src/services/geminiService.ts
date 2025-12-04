import { GoogleGenerativeAI } from "@google/generative-ai";

// === API KEY DESDE .env ===
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("❌ Falta VITE_GEMINI_API_KEY en tu archivo .env.local");
}

const genAI = new GoogleGenerativeAI(apiKey);

// === MODELO CORRECTO SEGÚN TU LISTA DE MODELOS ===
// (Lo has demostrado tú misma en la captura)
const model = genAI.getGenerativeModel({
  model: "models/gemini-2.5-flash",
});

// === HISTORIAL LOCAL DE CHAT ===
let chatHistory: any[] = [];

// Inicializa la sesión
export const initChatSession = () => {
  chatHistory = [];
  console.log("Chat session initialized.");
};

// === ENVÍO DE MENSAJES ===
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

  const request = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  };

  try {
    const result = await model.generateContent(request);
    const response = result.response;

    return {
      text: response.text()
    };
  } catch (error: any) {
    console.error("❌ Error al llamar a Gemini:", error);
    return {
      text: "⚠️ Ha ocurrido un error procesando tu mensaje."
    };
  }
};