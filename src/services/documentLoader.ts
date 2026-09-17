import axios from 'axios';

interface GitHubFile {
  name: string;
  path: string;
  download_url: string;
  type: string;
}

interface DocumentChunk {
  text: string;
  source: string;
  path: string;
}

const CHUNK_SIZE = 500; // words per chunk
const CHUNK_OVERLAP = 50; // overlapping words between chunks

// Split text into overlapping chunks
function chunkText(text: string, source: string, path: string): DocumentChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (chunk.trim().length < 50) continue; // skip tiny chunks

    chunks.push({ text: chunk, source, path });
  }

  return chunks;
}

// Recursively fetch all markdown files from a GitHub folder and its subdirectories
async function fetchFilesRecursively(
  owner: string,
  repo: string,
  folderPath: string,
  source: string
): Promise<DocumentChunk[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`;
  const { data: items } = await axios.get<GitHubFile[]>(apiUrl);

  const allChunks: DocumentChunk[] = [];

  for (const item of items) {
    if (item.type === 'file' && item.name.endsWith('.md')) {
      // It's a markdown file — fetch and chunk it
      const { data: content } = await axios.get<string>(item.download_url);
      const chunks = chunkText(content, source, item.path);
      allChunks.push(...chunks);
      console.log(`  ✓ ${item.path} → ${chunks.length} chunks`);
    } else if (item.type === 'dir') {
      // It's a subdirectory — go deeper
      console.log(`  📁 Entering subdirectory: ${item.path}`);
      const subChunks = await fetchFilesRecursively(owner, repo, item.path, source);
      allChunks.push(...subChunks);
    }
  }

  return allChunks;
}

// Fetch markdown files from a GitHub repository folder (with recursive support)
export async function fetchGitHubDocs(
  owner: string,
  repo: string,
  folderPath: string,
  source: string
): Promise<DocumentChunk[]> {
  console.log(`Fetching files from ${owner}/${repo}/${folderPath}...`);
  const chunks = await fetchFilesRecursively(owner, repo, folderPath, source);
  console.log(`Found ${chunks.length} total chunks`);
  return chunks;
}