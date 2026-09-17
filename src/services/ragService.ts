import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding } from './embeddings';
import { vectorSearch } from './vectorStore';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Build a prompt that includes retrieved context chunks
function buildSystemPrompt(contextChunks: { text: string; source: string }[]): string {
  const context = contextChunks
    .map((chunk, i) => `[${i + 1}] (source: ${chunk.source})\n${chunk.text}`)
    .join('\n\n');

  return `You are a helpful assistant that answers questions about AI development, Claude API, and OpenAI API.

Use the following documentation excerpts to answer the question. If the context doesn't contain enough information, say so honestly.

CONTEXT:
${context}`;
}

// Reformulate the question using conversation history for better vector search
async function reformulateQuestion(question: string, history: Message[]): Promise<string> {
  // If no history — question is already standalone
  if (history.length === 0) return question;

  const response = await anthropic.messages.create({
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
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text.trim() : question;
}

// Main RAG function: search relevant docs → ask Claude with conversation history
export async function askWithRAG(
  question: string,
  history: Message[]
): Promise<{ answer: string; sources: { source: string; score: string }[] }> {
  // Step 1: reformulate question with context, then convert to embedding
  const standaloneQuestion = await reformulateQuestion(question, history);
  const queryEmbedding = await generateEmbedding(standaloneQuestion, 'query');

  // Step 2: find top-5 most relevant chunks from MongoDB
  const relevantChunks = await vectorSearch(queryEmbedding, 5);

  if (relevantChunks.length === 0) {
    return { answer: 'No relevant documentation found for your question.', sources: [] };
  }

  // Step 3: build system prompt with context
  const systemPrompt = buildSystemPrompt(relevantChunks);

  // Step 4: send conversation history + new question to Claude
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history,
      { role: 'user', content: question },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const sources = relevantChunks.map((c: any) => ({
    source: c.source,
    score: (c.score as number).toFixed(3),
  }));

  return {
    answer: textBlock ? textBlock.text : 'No response generated.',
    sources,
  };
}