import 'dotenv/config';
import * as readline from 'readline';
import { askWithRAG, Message } from './services/ragService';
import { closeConnection } from './services/vectorStore';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log('🤖 AI Docs Chatbot (type "exit" to quit)\n');

  const history: Message[] = [];

  while (true) {
    const question = await ask('You: ');

    if (question.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      break;
    }

    if (!question.trim()) continue;

    try {
      console.log('\n🔍 Searching docs...\n');
      process.stdout.write('Assistant: ');

      const { answer, sources } = await askWithRAG(question, history, (token) => {
        process.stdout.write(token);
      });

      console.log('\n\n📚 Sources used:');
      sources.forEach((s) => console.log(`  • ${s.source} (similarity: ${s.score})`));
      console.log();

      history.push(
        { role: 'user', content: question },
        { role: 'assistant', content: answer }
      );
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Please try again.\n');
    }
  }

  rl.close();
  await closeConnection();
}

main().catch(console.error);