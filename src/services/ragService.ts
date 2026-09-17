import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding, rerankDocuments } from './embeddings';
import { vectorSearch } from './vectorStore';
import { withRetry } from '../utils/retry';
import { ANTHROPIC_API_KEY, MODELS, RAG, RETRY } from '../config';
import type { Message } from '../types';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

function log(step: string, ms?: number): void {
  const time = new Date().toTimeString().slice(0, 8);
  const duration = ms !== undefined ? ` (${ms}ms)` : '';
  process.stdout.write(`[${time}] ${step}${duration}\n`);
}


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
  let t = Date.now();
  log('Reformulating question...');
  const standaloneQuestion = await reformulateQuestion(question, history);
  log('Reformulated', Date.now() - t);

  // Step 2: convert question to embedding vector
  t = Date.now();
  log('Generating embedding...');
  const queryEmbedding = await withRetry(
    () => generateEmbedding(standaloneQuestion, 'query'),
    RETRY.attempts,
    RETRY.initialDelayMs
  );
  log('Embedded', Date.now() - t);

  // Step 3: find candidate chunks from MongoDB (fetch more than needed for reranking)
  t = Date.now();
  log(`Vector search (top-${RAG.topKCandidates})...`);
  const candidates = await vectorSearch(queryEmbedding, RAG.topKCandidates);
  log(`Found ${candidates.length} candidates`, Date.now() - t);

  if (candidates.length === 0) {
    return { answer: 'No relevant documentation found for your question.', sources: [] };
  }

  // Step 4: rerank candidates to surface the most relevant chunks
  t = Date.now();
  log(`Reranking to top-${RAG.topKReranked}...`);
  const relevantChunks = await rerankDocuments(standaloneQuestion, candidates, RAG.topKReranked);
  log('Reranked', Date.now() - t);

  // Step 5: build context-aware system prompt
  const systemPrompt = buildSystemPrompt(relevantChunks);

  const sources = relevantChunks.map((c) => ({
    source: c.source,
    score: (c.score as number).toFixed(3),
  }));

  // Step 6: generate response (streaming or regular)
  t = Date.now();
  log('Generating answer...');
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

    process.stdout.write('\n');
    log('Done', Date.now() - t);
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

  log('Done', Date.now() - t);
  const textBlock = response.content.find((block) => block.type === 'text');
  return {
    answer: textBlock ? textBlock.text : 'No response generated.',
    sources,
  };
}
