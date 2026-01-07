export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any) {
  return res.status(200).json({
    text: "⚠️ Respuesta simulada desde backend. El frontend funciona."
  });
}