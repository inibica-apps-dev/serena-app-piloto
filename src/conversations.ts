import { Message, Role } from "./types";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

const CONVERSATIONS_KEY = "serena_conversations";
const ACTIVE_CONVERSATION_KEY = "serena_active_conversation_id";

export function createGreetingMessage(initialGreeting: string): Message {
  return {
    id: `init-${Date.now()}`,
    role: Role.MODEL,
    content: initialGreeting,
    timestamp: new Date(),
  };
}

export function createConversation(initialGreeting: string): Conversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "Nueva conversación",
    createdAt: now,
    updatedAt: now,
    messages: [createGreetingMessage(initialGreeting)],
  };
}

export function getConversationTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((msg) => msg.role === Role.USER);
  return firstUserMessage?.content?.slice(0, 50) || "Nueva conversación";
}

export function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Conversation[];

    return parsed.map((conv) => ({
      ...conv,
      messages: conv.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error("Error cargando conversaciones:", error);
    return [];
  }
}

export function saveActiveConversationId(id: string | null) {
  if (!id) {
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
}

export function loadActiveConversationId(): string | null {
  return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
}