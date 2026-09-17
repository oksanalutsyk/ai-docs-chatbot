import 'dotenv/config';
import '../config'; // triggers environment validation on startup
import axios from 'axios';
import { fetchGitHubDocs } from '../services/documentLoader';
import { generateEmbedding } from '../services/embeddings';
import { insertDocument, clearDocuments, closeConnection } from '../services/vectorStore';
import { GITHUB_HEADERS, CHUNKING } from '../config';
import { FOLDER_SOURCES, FILE_SOURCES } from '../config/sources';




// Word-based chunking used for individual FILE_SOURCES
function chunkText(text: string, source: string, path: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += CHUNKING.chunkSize - CHUNKING.chunkOverlap) {
    const chunk = words.slice(i, i + CHUNKING.chunkSize).join(' ');
    if (chunk.trim().length < CHUNKING.minChunkLength) continue;
    chunks.push({ text: chunk, source, path });
  }
  return chunks;
}

async function ingest() {
  console.log('Starting documentation ingestion...\n');
  await clearDocuments();
  console.log();

  let totalChunks = 0;

  // Ingest folder-based sources (uses markdown-aware chunking via documentLoader)
  for (const src of FOLDER_SOURCES) {
    const chunks = await fetchGitHubDocs(src.owner, src.repo, src.folder, src.source);

    if (chunks.length === 0) {
      console.log(`⚠️  No markdown files found in ${src.owner}/${src.repo}/${src.folder}\n`);
      continue;
    }

    console.log(`\nGenerating embeddings and saving to MongoDB...`);
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i].text, 'document');
      await insertDocument(chunks[i].text, embedding, chunks[i].source);
      process.stdout.write(`\r  Progress: ${i + 1}/${chunks.length}`);
    }
    totalChunks += chunks.length;
    console.log(`\n✓ ${src.source} (${src.folder}): ${chunks.length} chunks saved\n`);
  }

  // Ingest individual files via GitHub API
  console.log('Fetching individual markdown files...');
  for (const file of FILE_SOURCES) {
    try {
      const { data: meta } = await axios.get<{ download_url: string; path: string }>(
        file.apiUrl,
        { headers: GITHUB_HEADERS }
      );
      const { data: content } = await axios.get<string>(meta.download_url);
      const chunks = chunkText(content, file.source, meta.path);
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.text, 'document');
        await insertDocument(chunk.text, embedding, chunk.source);
      }
      console.log(`  ✓ ${meta.path} → ${chunks.length} chunks`);
      totalChunks += chunks.length;
    } catch (error) {
      console.warn(`  ⚠️  Skipped ${file.apiUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\nIngestion complete! Total chunks: ${totalChunks}`);
  await closeConnection();
}

ingest().catch(console.error);
