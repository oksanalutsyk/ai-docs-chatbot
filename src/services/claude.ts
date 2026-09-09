import Anthropic from '@anthropic-ai/sdk';
import type { AppConfig, ConversationHistory } from '../types';

/**
 * Sends a message to Claude and streams the response to stdout.
 * Maintains conversation history for multi-turn context.
 *
 * @param client - Anthropic API client
 * @param config - Application configuration
 * @param history - Current conversation history (mutated in place)
 * @param userMessage - The user's input message
 * @returns The full assistant response as a string
 */
export async function sendMessage(
  client: Anthropic,
  config: AppConfig,
  history: ConversationHistory,
  userMessage: string
): Promise<string> {
  // Add user message to history
  history.messages.push({ role: 'user', content: userMessage });

  let fullResponse = '';

  const stream = client.messages.stream({
    model: config.model,
    max_tokens: config.maxTokens,
    system: config.systemPrompt,
    messages: history.messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      process.stdout.write(chunk.delta.text);
      fullResponse += chunk.delta.text;
    }
  }

  console.log('\n');

  // Add assistant response to history for next turn
  history.messages.push({ role: 'assistant', content: fullResponse });

  return fullResponse;
}

/**
 * Clears the conversation history, starting a fresh session.
 *
 * @param history - Conversation history to clear
 */
export function clearHistory(history: ConversationHistory): void {
  history.messages = [];
  console.log('Conversation history cleared.\n');
}