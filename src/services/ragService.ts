import Anthropic from '@anthropic-ai/sdk';
import { generateEmbedding } from './embeddings';
import { vectorSearch } from './vectorStore';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Build a prompt that includes retrieved context chunks
function buildPrompt(question: string, contextChunks: { text: string; source: string }[]): string {
  const context = contextChunks
    .map((chunk, i) => `[${i + 1}] (source: ${chunk.source})\n${chunk.text}`)
    .join('\n\n');

  return `You are a helpful assistant that answers questions about AI development, Claude API, and OpenAI API.

Use the following documentation excerpts to answer the question. If the context doesn't contain enough information, say so honestly.

CONTEXT:
${context}

QUESTION:
${question}`;
}

// Main RAG function: search relevant docs → ask Claude
export async function askWithRAG(question: string): Promise<{ answer: string; sources: { source: string; score: string }[] }> {
  // Step 1: convert question to embedding
const queryEmbedding = await generateEmbedding(question, 'query');

  // Step 2: find top-5 most relevant chunks from MongoDB
  const relevantChunks = await vectorSearch(queryEmbedding, 5);

  if (relevantChunks.length === 0) {
    return { answer: 'No relevant documentation found for your question.', sources: [] };
  }

  // Step 3: build prompt with context and send to Claude
  const prompt = buildPrompt(question, relevantChunks);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
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