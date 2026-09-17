import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding } from './embeddings';
import { vectorSearch } from './vectorStore';
import { withRetry } from '../utils/retry';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Build a system prompt that includes retrieved context chunks
function buildSystemPrompt(contextChunks: { text: string; source: string }[]): string {
  const context = contextChunks
    .map((chunk, i) => `[${i + 1}] (source: ${chunk.source})\n${chunk.text}`)
    .join('\n\n');

  return `You are a helpful assistant that answers questions about AI development, Claude API, and OpenAI API.

Use the following documentation excerpts to answer the question. If the context doesn't contain enough information, say so honestly.

CONTEXT:
${context}`;
}

// Reformulate follow-up questions into standalone questions for better vector search
async function reformulateQuestion(question: string, history: Message[]): Promise<string> {
  if (history.length === 0) return question;

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
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
    })
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text.trim() : question;
}

// Main RAG function with optional streaming via onToken callback
export async function askWithRAG(
  question: string,
  history: Message[],
  onToken?: (token: string) => void
): Promise<{ answer: string; sources: { source: string; score: string }[] }> {
  // Step 1: reformulate question with context, then convert to embedding
  const standaloneQuestion = await withRetry(() => reformulateQuestion(question, history));
  const queryEmbedding = await withRetry(() => generateEmbedding(standaloneQuestion, 'query'));

  // Step 2: find top-5 most relevant chunks from MongoDB
  const relevantChunks = await vectorSearch(queryEmbedding, 5);

  if (relevantChunks.length === 0) {
    return { answer: 'No relevant documentation found for your question.', sources: [] };
  }

  // Step 3: build system prompt with context
  const systemPrompt = buildSystemPrompt(relevantChunks);

  const sources = relevantChunks.map((c: any) => ({
    source: c.source,
    score: (c.score as number).toFixed(3),
  }));

  // Step 4: stream or regular response depending on onToken callback
  if (onToken) {
    let fullAnswer = '';

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
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

  // Non-streaming fallback
  const response = await withRetry(() =>
    anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...history, { role: 'user', content: question }],
    })
  );

  const textBlock = response.content.find((block) => block.type === 'text');
  return {
    answer: textBlock ? textBlock.text : 'No response generated.',
    sources,
  };
}
