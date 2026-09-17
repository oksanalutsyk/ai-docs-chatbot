import { MongoClient, Collection, Document } from 'mongodb';

// Document structure stored in MongoDB
interface VectorDocument {
  text: string;
  embedding: number[];
  source: string;
  createdAt: Date;
}

let client: MongoClient | null = null;

async function getCollection(): Promise<Collection<VectorDocument>> {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Missing MONGODB_URI environment variable');
    }
    client = new MongoClient(uri);
    await client.connect();
  }

  return client
    .db('ai-docs-chatbot')
    .collection<VectorDocument>('documents');
}

export async function insertDocument(
  text: string,
  embedding: number[],
  source: string
): Promise<void> {
  const collection = await getCollection();
  await collection.insertOne({
    text,
    embedding,
    source,
    createdAt: new Date(),
  });
}

export async function vectorSearch(
  queryEmbedding: number[],
  limit: number = 5
): Promise<VectorDocument[]> {
  const collection = await getCollection();

  const results = await collection
    .aggregate<VectorDocument>([
      {
        $vectorSearch: {
          index: 'vector_index',
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
    .toArray();

  return results;
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

  // Delete all documents from the collection (used before re-ingestion)
export async function clearDocuments(): Promise<void> {
  const collection = await getCollection();
  const result = await collection.deleteMany({});
  console.log(`🗑️  Cleared ${result.deletedCount} old documents from MongoDB`);
}