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
  {
    owner: 'openai',
    repo: 'openai-cookbook',
    folder: 'examples/vector_databases',
    source: 'openai-docs',
  },
  {
    owner: 'openai',
    repo: 'openai-cookbook',
    folder: 'examples/evaluation',
    source: 'openai-docs',
  },
];

// Individual markdown files fetched via GitHub API
const FILE_SOURCES = [
  // Anthropic courses — API fundamentals and prompting
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
  // Anthropic SDK — streaming helpers (events, chunks, text_stream)
  {
    apiUrl: 'https://api.github.com/repos/anthropics/anthropic-sdk-python/contents/helpers.md',
    source: 'anthropic-docs',
  },
  // Anthropic SDK — full API reference (models, tokens, context management)
  {
    apiUrl: 'https://api.github.com/repos/anthropics/anthropic-sdk-python/contents/api.md',
    source: 'anthropic-docs',
  },
  // Claude cookbooks — agent SDK with context window management
  {
    apiUrl: 'https://api.github.com/repos/anthropics/claude-cookbooks/contents/claude_agent_sdk/README.md',
    source: 'anthropic-docs',
  },
  // Claude cookbooks — capabilities overview (RAG, classification, embeddings)
  {
    apiUrl: 'https://api.github.com/repos/anthropics/claude-cookbooks/contents/capabilities/README.md',
    source: 'anthropic-docs',
  },
  // OpenAI Python SDK README — streaming with chunk/event examples
  {
    apiUrl: 'https://api.github.com/repos/openai/openai-python/contents/README.md',
    source: 'openai-docs',
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
      const embedding = await generateEmbedding(chunks[i].text, 'document');
      await insertDocument(chunks[i].text, embedding, chunks[i].source);
      process.stdout.write(`\r  Progress: ${i + 1}/${chunks.length}`);
    }
    totalChunks += chunks.length;
    console.log(`\n✓ ${src.source} (${src.folder}): ${chunks.length} chunks saved\n`);
  }

  // Ingest individual files via GitHub API
  console.log('Fetching individual markdown files...');
  const githubHeaders = process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};

  for (const file of FILE_SOURCES) {
    try {
      const { data: meta } = await axios.get<{ download_url: string; path: string }>(
        file.apiUrl,
        { headers: githubHeaders }
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
