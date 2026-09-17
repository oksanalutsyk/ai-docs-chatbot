// ─── RAG pipeline types ───────────────────────────────────────────────────────

/** A single message in the conversation (user or assistant turn) */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** A chunk of text extracted from a source document during ingestion */
export interface DocumentChunk {
  text: string;
  source: string;
  path: string;
}

/** A document stored in MongoDB Atlas with its embedding vector */
export interface VectorDocument {
  text: string;
  embedding: number[];
  source: string;
  /** Cosine similarity score returned by MongoDB vectorSearchScore (0–1) */
  score?: number;
  createdAt: Date;
}

// ─── Evaluation types ─────────────────────────────────────────────────────────

/** A single RAG evaluation test case */
export interface TestCase {
  question: string;
  expectedKeywords: string[];
}

/** The result of running a single evaluation test case */
export interface EvalResult {
  question: string;
  answer: string;
  sources: { source: string; score: string }[];
  topScore: number;
  keywordsFound: string[];
  keywordsMissed: string[];
  passed: boolean;
}

// ─── GitHub API types ─────────────────────────────────────────────────────────

/** A file or directory entry returned by the GitHub Contents API */
export interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
  type: 'file' | 'dir';
}
