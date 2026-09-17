import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding } from './embeddings';
import { vectorSearch } from './vectorStore';
import { withRetry } from '../utils/retry';
import { ANTHROPIC_API_KEY, MODELS, RAG, RETRY } from '../config';
import type { Message } from '../types';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });


/**
 * Builds a system prompt that injects retrieved documentation chunks as context.
 */
function buildSystemPrompt(contextChunks: { text: string; source: string }[]): string {
  const context = contextChunks
    .map((chunk, i) => `[${i + 1}] (source: ${chunk.source})\n${chunk.text}`)
    .join('\n\n');

  return `You are a helpful assistant that answers questions about AI development, Claude API, and OpenAI API.

Use the following documentation excerpts to answer the question. If the context doesn't contain enough information, say so honestly.

CONTEXT:
${context}`;
}

/**
 * Reformulates a follow-up question into a standalone question using conversation history.
 * This improves vector search accuracy for context-dependent queries like "Tell me more".
 */
async function reformulateQuestion(question: string, history: Message[]): Promise<string> {
  if (history.length === 0) return question;

  const response = await withRetry(
    () =>
      anthropic.messages.create({
        model: MODELS.reformulation,
        max_tokens: RAG.maxReformulationTokens,
        messages: [
          {
            role: 'user',
            content: `Given this conversation history:
${history.map((m) => `${m.role}: ${m.content}`).join('\n')}

Reformulate this follow-up question into a single standalone question that contains all necessary context:
"${question}"

Return only the reformulated question, nothing else.`,
          },
        ],
      }),
    RETRY.attempts,
    RETRY.initialDelayMs
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text.trim() : question;
}

/**
 * Main RAG pipeline: reformulate → embed → retrieve → generate.
 * Supports optional streaming via the onToken callback.
 *
 * @param question - The user's question
 * @param history - Previous conversation messages for context
 * @param onToken - Optional callback called with each streamed text token
 * @returns The generated answer and the sources used
 */
export async function askWithRAG(
  question: string,
  history: Message[],
  onToken?: (token: string) => void
): Promise<{ answer: string; sources: { source: string; score: string }[] }> {
  // Step 1: reformulate follow-up questions for better retrieval
  const standaloneQuestion = await reformulateQuestion(question, history);

  // Step 2: convert question to embedding vector
  const queryEmbedding = await withRetry(
    () => generateEmbedding(standaloneQuestion, 'query'),
    RETRY.attempts,
    RETRY.initialDelayMs
  );

  // Step 3: find the most relevant chunks from MongoDB
  const relevantChunks = await vectorSearch(queryEmbedding, RAG.topK);

  if (relevantChunks.length === 0) {
    return { answer: 'No relevant documentation found for your question.', sources: [] };
  }

  // Step 4: build context-aware system prompt
  const systemPrompt = buildSystemPrompt(relevantChunks);

  const sources = relevantChunks.map((c) => ({
    source: c.source,
    score: (c.score as number).toFixed(3),
  }));

  // Step 5: generate response (streaming or regular)
  if (onToken) {
    let fullAnswer = '';

    const stream = anthropic.messages.stream({
      model: MODELS.chat,
      max_tokens: RAG.maxResponseTokens,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: question }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        onToken(chunk.delta.text);
        fullAnswer += chunk.delta.text;
      }
    }

    return { answer: fullAnswer, sources };
  }

  const response = await withRetry(
    () =>
      anthropic.messages.create({
        model: MODELS.chat,
        max_tokens: RAG.maxResponseTokens,
        system: systemPrompt,
        messages: [...history, { role: 'user', content: question }],
      }),
    RETRY.attempts,
    RETRY.initialDelayMs
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  return {
    answer: textBlock ? textBlock.text : 'No response generated.',
    sources,
  };
}
