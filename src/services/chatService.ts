export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  text: string;
}

export const sendMessage = async (
  message: string,
  deepMode: boolean = false,
  history: ChatMessage[] = []
): Promise<ChatResponse> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      deepMode,
      history,
    }),
  });

  if (!response.ok) {
    throw new Error("Error al conectar con el backend");
  }

  return response.json();
};