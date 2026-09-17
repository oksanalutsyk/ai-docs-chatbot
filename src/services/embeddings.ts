import { VoyageAIClient } from 'voyageai';
import { VOYAGE_API_KEY, MODELS } from '../config';
import type { VectorDocument } from '../types';

const client = new VoyageAIClient({ apiKey: VOYAGE_API_KEY });

/**
 * Generates an embedding vector for a given text using Voyage AI.
 *
 * @param text - The input text to embed
 * @param inputType - 'document' for indexing, 'query' for search queries
 * @returns A numeric vector representing the text
 */
export async function generateEmbedding(
  text: string,
  inputType: 'document' | 'query' = 'document'
): Promise<number[]> {
  const response = await client.embed({
    input: text,
    model: MODELS.embedding,
    inputType,
  });

  const embedding = response.data?.[0]?.embedding;
  if (!embedding) throw new Error('No embedding returned from Voyage AI');

  return embedding;
}

/**
 * Calculates cosine similarity between two vectors.
 * Returns a value between -1 (opposite) and 1 (identical).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have the same length');

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot compute similarity for zero vectors');
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Reranks a list of document chunks using Voyage AI rerank-2.
 * Returns the top-K most relevant chunks, ordered by relevance score descending.
 *
 * @param query - The search query
 * @param documents - Candidate chunks from vector search
 * @param topK - Number of chunks to return after reranking
 */
export async function rerankDocuments(
  query: string,
  documents: VectorDocument[],
  topK: number
): Promise<VectorDocument[]> {
  const response = await client.rerank({
    query,
    documents: documents.map((d) => d.text),
    model: MODELS.rerank,
    topK,
  });

  return (response.data ?? []).map((item) => documents[item.index!]);
}
