import 'dotenv/config';
import { generateEmbedding, cosineSimilarity } from './services/embeddings';

// Phrases from different topics — embeddings should cluster them correctly
const phrases = [
  // Topic 1: Streaming
  'How to stream responses from Claude API',
  'Server-sent events for real-time text generation',
  'Streaming tokens with Anthropic SDK',

  // Topic 2: RAG
  'Retrieval Augmented Generation architecture',
  'How to build a RAG chatbot with embeddings',
  'Vector search for document retrieval',

  // Topic 3: API errors
  'How to handle rate limit errors in OpenAI',
  'Retry logic for API 429 too many requests',
  'Exponential backoff for API errors',

  // Topic 4: Unrelated
  'Best pizza recipe with mozzarella',
  'How to grow tomatoes in a garden',
];

async function main() {
  console.log('Generating embeddings for', phrases.length, 'phrases...\n');

  const items = await Promise.all(
    phrases.map(async (text) => ({
      text,
      embedding: await generateEmbedding(text),
    }))
  );

  // For each phrase, find top-3 nearest neighbors
  console.log('=== TOP NEIGHBORS FOR EACH PHRASE ===\n');

  for (const item of items) {
    const scores = items
      .filter((other) => other.text !== item.text)
      .map((other) => ({
        text: other.text,
        score: cosineSimilarity(item.embedding, other.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    console.log(`📌 "${item.text}"`);
    for (const neighbor of scores) {
      const bar = '█'.repeat(Math.round(neighbor.score * 20));
      console.log(`   ${neighbor.score.toFixed(3)} ${bar} "${neighbor.text}"`);
    }
    console.log();
  }
}

main().catch(console.error);