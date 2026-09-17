import 'dotenv/config';
import axios from 'axios';
import { fetchGitHubDocs } from './services/documentLoader';
import { generateEmbedding } from './services/embeddings';
import { insertDocument, clearDocuments, closeConnection } from './services/vectorStore';

// Folder-based sources (recursive .md fetch)
const FOLDER_SOURCES = [
  {
    owner: 'anthropics',
    repo: 'anthropic-cookbook',
    folder: 'patterns',
    source: 'anthropic-docs',
  },
  {
    owner: 'openai',
    repo: 'openai-cookbook',
    folder: 'articles',
    source: 'openai-docs',
  },
];

// Individual markdown files to fetch via GitHub API (gets correct branch automatically)
const FILE_SOURCES = [
  {
    apiUrl: 'https://api.github.com/repos/anthropics/courses/contents/anthropic_api_fundamentals/README.md',
    source: 'anthropic-docs',
  },
  {
    apiUrl: 'https://api.github.com/repos/anthropics/courses/contents/prompt_engineering_interactive_tutorial/README.md',
    source: 'anthropic-docs',
  },
  {
    apiUrl: 'https://api.github.com/repos/anthropics/courses/contents/real_world_prompting/README.md',
    source: 'anthropic-docs',
  },
  {
    apiUrl: 'https://api.github.com/repos/anthropics/courses/contents/tool_use/README.md',
    source: 'anthropic-docs',
  },
];

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

function chunkText(text: string, source: string, path: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim().length < 50) continue;
    chunks.push({ text: chunk, source, path });
  }
  return chunks;
}

async function ingest() {
  console.log('Starting documentation ingestion...\n');
  await clearDocuments();
  console.log();

  let totalChunks = 0;

  // Ingest folder-based sources
  for (const src of FOLDER_SOURCES) {
    const chunks = await fetchGitHubDocs(src.owner, src.repo, src.folder, src.source);

    if (chunks.length === 0) {
      console.log(`⚠️  No markdown files found in ${src.owner}/${src.repo}/${src.folder}\n`);
      continue;
    }

    console.log(`\nGenerating embeddings and saving to MongoDB...`);
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i].text);
      await insertDocument(chunks[i].text, embedding, chunks[i].source);
      process.stdout.write(`\r  Progress: ${i + 1}/${chunks.length}`);
    }
    totalChunks += chunks.length;
    console.log(`\n✓ ${src.source} (${src.folder}): ${chunks.length} chunks saved\n`);
  }

    // Ingest individual files via GitHub API
  console.log('Fetching individual markdown files...');
  for (const file of FILE_SOURCES) {
    const { data: meta } = await axios.get<{ download_url: string; path: string }>(file.apiUrl);
    const { data: content } = await axios.get<string>(meta.download_url);
    const chunks = chunkText(content, file.source, meta.path);
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text);
      await insertDocument(chunk.text, embedding, chunk.source);
    }
    console.log(`  ✓ ${meta.path} → ${chunks.length} chunks`);
    totalChunks += chunks.length;
  }
  console.log(`\nIngestion complete! Total chunks: ${totalChunks}`);
  await closeConnection();
}

ingest().catch(console.error);