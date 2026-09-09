import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';
import 'dotenv/config';

import { loadConfig } from './config';
import { sendMessage, clearHistory } from './services/claude';
import type { ConversationHistory } from './types';

/**
 * Displays available commands to the user.
 */
function showHelp(): void {
  console.log(`
Commands:
  /clear   — clear conversation history
  /help    — show this message
  /exit    — quit the program
  `);
}

/**
 * Main entry point. Initializes the CLI chat loop.
 */
async function main(): Promise<void> {
  // Load and validate config — throws immediately if API key is missing
  const config = loadConfig();

  const client = new Anthropic({ apiKey: config.apiKey });

  const history: ConversationHistory = { messages: [] };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Graceful shutdown on Ctrl+C
  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });

  console.log('AI Docs Assistant — Anthropic & OpenAI Documentation');
  console.log('Type /help for available commands\n');

  const ask = (): void => {
    rl.question('You: ', async (input) => {
      const trimmed = input.trim();

      // Skip empty input
      if (!trimmed) {
        ask();
        return;
      }

      // Handle commands
      if (trimmed === '/exit') {
        rl.close();
        return;
      }

      if (trimmed === '/clear') {
        clearHistory(history);
        ask();
        return;
      }

      if (trimmed === '/help') {
        showHelp();
        ask();
        return;
      }

      try {
        await sendMessage(client, config, history, trimmed);
      } catch (error) {
        if (error instanceof Anthropic.APIError) {
          console.error(`\nAPI Error ${error.status}: ${error.message}\n`);
        } else {
          console.error('\nUnexpected error:', error, '\n');
        }
      }

      ask();
    });
  };

  ask();
}

main();