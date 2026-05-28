export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatSource {
  kind: string;
  title: string;
  snippet: string;
  distance: number;
}

export interface ChatRequest {
  question: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}
