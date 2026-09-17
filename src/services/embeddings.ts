import { VoyageAIClient } from 'voyageai';

const client = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

/**
 * Generates an embedding vector for a given text.
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
    model: 'voyage-3-lite',
    inputType,
  });

  const embedding = response.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error('No embedding returned from Voyage AI');
  }

  return embedding;
}

/**
 * Calculates cosine similarity between two vectors.
 * Returns a value between -1 (opposite) and 1 (identical).
 *
 * @param a - First vector
 * @param b - Second vector
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot compute similarity for zero vectors');
  }

  return dotProduct / (magnitudeA * magnitudeB);
}