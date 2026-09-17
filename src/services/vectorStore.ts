import { MongoClient, Collection } from 'mongodb';
import { MONGODB_URI, MONGODB, RAG, RETRY } from '../config';
import type { VectorDocument } from '../types';
import { withRetry } from '../utils/retry';


let client: MongoClient | null = null;

async function getCollection(): Promise<Collection<VectorDocument>> {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await withRetry(() => client!.connect(), RETRY.attempts, RETRY.initialDelayMs);
  }

  return client.db(MONGODB.dbName).collection<VectorDocument>(MONGODB.collection);
}

/**
 * Inserts a single document chunk with its embedding into MongoDB.
 */
export async function insertDocument(
  text: string,
  embedding: number[],
  source: string
): Promise<void> {
  const collection = await getCollection();
  await withRetry(
    () => collection.insertOne({ text, embedding, source, createdAt: new Date() }),
    RETRY.attempts,
    RETRY.initialDelayMs
  );
}

/**
 * Performs vector similarity search and returns the top-k most relevant chunks.
 * Results include a `score` field (0–1) from MongoDB vectorSearchScore.
 */
export async function vectorSearch(
  queryEmbedding: number[],
  limit: number = RAG.topK
): Promise<VectorDocument[]> {
  const collection = await getCollection();

  return withRetry(
    () =>
      collection
        .aggregate<VectorDocument>([
          {
            $vectorSearch: {
              index: MONGODB.vectorIndex,
              path: 'embedding',
              queryVector: queryEmbedding,
              numCandidates: limit * 10,
              limit,
            },
          },
          {
            $project: {
              text: 1,
              source: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ])
        .toArray(),
    RETRY.attempts,
    RETRY.initialDelayMs
  );
}

/**
 * Removes all documents from the collection.
 * Used before a full re-ingestion.
 */
export async function clearDocuments(): Promise<void> {
  const collection = await getCollection();
  const result = await collection.deleteMany({});
  console.log(`🗑️  Cleared ${result.deletedCount} old documents from MongoDB`);
}

/**
 * Closes the MongoDB connection gracefully.
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
