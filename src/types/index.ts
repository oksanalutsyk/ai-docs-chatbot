import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

/** Represents a single message in the conversation */
export interface Message extends MessageParam {}

/** Conversation history for multi-turn chat */
export interface ConversationHistory {
  messages: Message[];
}

/** Application configuration */
export interface AppConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
}