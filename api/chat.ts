import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_INSTRUCTION = `
Eres Serena, un asistente virtual avanzado y empático diseñado para ofrecer
intervenciones educativas sobre salud mental y farmacología.

IMPORTANTE:
- No diagnostiques
- No prescribas
- No sustituyas a un profesional sanitario
- Usa un tono claro, calmado y educativo
- Responde en español
- Ofrece información basada en evidencia científica

Si el usuario pregunta por ejercicios de relajación, respiración o mindfulness,
describe el ejercicio paso a paso y sugiere que existen videos educativos en YouTube en español.

Añade siempre una nota recordando consultar con su profesional sanitario.
`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, deepMode = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: deepMode ? 380 : 220,
        temperature: 0.3,
      },
    });

    // Primera generación
    const first = await model.generateContent({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    });

    let text = first.response.text();

    // Continuación automática si es explicación profunda
    if (deepMode) {
      const continuation = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text }],
          },
          {
            role: "user",
            parts: [
              {
                text:
                  "Continúa la explicación anterior en profundidad, sin repetir la introducción, manteniendo un tono educativo y estructurado.",
              },
            ],
          },
        ],
      });

      text += "\n\n" + continuation.response.text();
    }

    return res.status(200).json({ text });

  } catch (error) {
    console.error("Backend Gemini error:", error);

    return res.status(500).json({
      text:
        "Ahora mismo no puedo responder a esta consulta con seguridad. Te recomiendo comentarlo con tu profesional sanitario 🌱",
    });
  }
}