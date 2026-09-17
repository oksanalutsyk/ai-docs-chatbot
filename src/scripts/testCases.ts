import type { TestCase } from '../types';

/**
 * Standalone test cases — each question is evaluated independently.
 * Keywords must appear in the answer for the test to pass.
 * Aligned with the actual document corpus in sources.ts.
 */
export const TEST_CASES: TestCase[] = [
  {
    question: 'How do I use streaming with the Anthropic API?',
    expectedKeywords: ['stream', 'event', 'text'],
  },
  {
    question: 'What embedding models does OpenAI offer?',
    expectedKeywords: ['embedding', 'ada', 'model'],
  },
  {
    question: 'How do I implement RAG with vector search?',
    expectedKeywords: ['retrieval', 'vector', 'embedding', 'search'],
  },
  {
    question: 'What are the differences between GPT-4 and Claude?',
    expectedKeywords: ['model', 'gpt', 'claude'],
  },
  {
    question: 'How does prompt engineering improve model responses?',
    expectedKeywords: ['prompt', 'model', 'instruction'],
  },
];

/**
 * Multi-turn conversation test — evaluates query reformulation
 * across a sequence of context-dependent follow-up questions.
 */
export const CONVERSATION_TEST: TestCase[] = [
  {
    question: 'What is prompt engineering?',
    expectedKeywords: ['prompt', 'instruction', 'model'],
  },
  {
    question: 'Can you give me an example of that?',
    expectedKeywords: ['example', 'prompt'],
  },
  {
    question: 'How does this relate to RAG?',
    expectedKeywords: ['retrieval', 'context', 'generation'],
  },
];
