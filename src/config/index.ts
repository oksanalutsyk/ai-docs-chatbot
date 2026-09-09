import type { AppConfig } from '../types';

const SYSTEM_PROMPT = `You are an expert assistant for Anthropic and OpenAI documentation.

Rules:
- Answer ONLY based on your knowledge of Anthropic and OpenAI APIs
- Be concise and precise
- Always include code examples when relevant
- If unsure, say so — never guess
- Cite the relevant documentation section when possible`;

/**
 * Loads and validates application configuration from environment variables.
 * Throws an error immediately if required variables are missing.
 */
export function loadConfig(): AppConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY environment variable.\n' +
      'Copy .env.example to .env and add your key from console.anthropic.com'
    );
  }

  return {
    apiKey,
    model: 'claude-haiku-4-5',
    maxTokens: 1024,
    systemPrompt: SYSTEM_PROMPT,
  };
}