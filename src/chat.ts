import 'dotenv/config';
import * as readline from 'readline';
import { askWithRAG } from './services/ragService';
import { closeConnection } from './services/vectorStore';

// Simple CLI chat interface for testing the RAG pipeline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log('🤖 AI Docs Chatbot (type "exit" to quit)\n');

  while (true) {
    const question = await ask('You: ');

    if (question.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      break;
    }

    if (!question.trim()) continue;

    console.log('\n🔍 Searching docs...');
    const { answer, sources } = await askWithRAG(question);
    console.log(`\nAssistant: ${answer}`);
    console.log('\n📚 Sources used:');
    sources.forEach((s) => console.log(`  • ${s.source} (similarity: ${s.score})`));
    console.log();
  }

  rl.close();
  await closeConnection();
}

main().catch(console.error);