import 'dotenv/config';
import { insertDocument, vectorSearch, closeConnection } from '../services/vectorStore';
import { generateEmbedding } from '../services/embeddings';

const testDocs = [
  { text: 'How to use streaming in Anthropic API', source: 'anthropic-docs' },
  { text: 'Streaming tokens with Claude SDK step by step', source: 'anthropic-docs' },
  { text: 'How to handle rate limit errors with retry logic', source: 'openai-docs' },
  { text: 'RAG architecture for building AI chatbots', source: 'anthropic-docs' },
  { text: 'Best pizza recipe with mozzarella cheese', source: 'unrelated' },
];

async function main() {
  // Insert test documents
  console.log('Inserting test documents...\n');
  for (const doc of testDocs) {
    const embedding = await generateEmbedding(doc.text);
    await insertDocument(doc.text, embedding, doc.source);
    console.log(`✓ Inserted: "${doc.text}"`);
  }

  // Search for similar documents
  const query = 'How do I stream responses from Claude?';
  console.log(`\nSearching for: "${query}"\n`);

  const queryEmbedding = await generateEmbedding(query);
  const results = await vectorSearch(queryEmbedding, 3);

  console.log('Top 3 results:');
  results.forEach((doc, i) => {
    console.log(`${i + 1}. [${(doc as any).score?.toFixed(3)}] "${doc.text}" (${doc.source})`);
  });

  await closeConnection();
}

main().catch(console.error);