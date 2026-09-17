/**
 * Central configuration for the AI Docs Chatbot.
 * All constants and environment variables are validated and exported from here.
 * Import from this file instead of using process.env or magic numbers directly.
 */

// --- Environment validation ---
// Fail fast on startup if required variables are missing
const REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'VOYAGE_API_KEY',
  'MONGODB_URI',
] as const;

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env file. See .env.example for reference.`
    );
  }
}

// --- API keys (guaranteed to be defined after validation above) ---
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
export const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
export const MONGODB_URI = process.env.MONGODB_URI!;
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // optional

/** Pre-built headers for GitHub API requests. Authenticated = 5000 req/hr, anonymous = 60 req/hr */
export const GITHUB_HEADERS = GITHUB_TOKEN
  ? { Authorization: `Bearer ${GITHUB_TOKEN}` }
  : {};

// --- Model names ---
export const MODELS = {
  /** Main chat model — used for RAG responses */
  chat: 'claude-haiku-4-5',
  /** Fast model — used for query reformulation */
  reformulation: 'claude-haiku-4-5',
  /** Voyage AI embedding model */
  embedding: 'voyage-3-lite',
} as const;

// --- RAG settings ---
export const RAG = {
  /** Number of document chunks to retrieve per query */
  topK: 5,
  /** Maximum tokens in the Claude response */
  maxResponseTokens: 1024,
  /** Maximum tokens for query reformulation */
  maxReformulationTokens: 100,
  /** Minimum similarity score to consider a chunk relevant */
  minScore: 0.6,
} as const;

// --- Chunking settings ---
export const CHUNKING = {
  /** Maximum words per chunk (word-based fallback) */
  chunkSize: 500,
  /** Overlapping words between consecutive chunks */
  chunkOverlap: 50,
  /** Minimum chunk length in characters — skip chunks shorter than this */
  minChunkLength: 50,
} as const;

// --- MongoDB settings ---
export const MONGODB = {
  dbName: 'ai-docs-chatbot',
  collection: 'documents',
  vectorIndex: 'vector_index',
} as const;

// --- Retry settings ---
export const RETRY = {
  /** Number of retry attempts for external API calls */
  attempts: 3,
  /** Initial delay in ms — doubles on each retry (exponential backoff) */
  initialDelayMs: 1000,
} as const;
