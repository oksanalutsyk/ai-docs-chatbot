import axios from 'axios';
import { CHUNKING, GITHUB_HEADERS } from '../config';
import type { DocumentChunk, GitHubFile } from '../types';



/**
 * Splits text into overlapping word-based chunks.
 * Used as the default chunking strategy and as a fallback for markdown files
 * that lack header structure.
 */
function chunkByWords(text: string, source: string, path: string): DocumentChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: DocumentChunk[] = [];

  for (let i = 0; i < words.length; i += CHUNKING.chunkSize - CHUNKING.chunkOverlap) {
    const chunk = words.slice(i, i + CHUNKING.chunkSize).join(' ');
    if (chunk.trim().length < CHUNKING.minChunkLength) continue;
    chunks.push({ text: chunk, source, path });
  }

  return chunks;
}

/**
 * Splits markdown text into chunks by header sections (##, ###).
 * Each section becomes one chunk, preserving semantic boundaries.
 * Falls back to word-based chunking if:
 * - The file has no headers
 * - A section exceeds the max chunk size
 */
function chunkByHeaders(text: string, source: string, path: string): DocumentChunk[] {
  // Split on lines that start with ## or ### (h2/h3 headers)
  const sections = text.split(/\n(?=#{2,3}\s)/);

  if (sections.length <= 1) {
    // No headers found — fall back to word-based chunking
    return chunkByWords(text, source, path);
  }

  const chunks: DocumentChunk[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < CHUNKING.minChunkLength) continue;

    const wordCount = trimmed.split(/\s+/).length;

    if (wordCount <= CHUNKING.chunkSize) {
      // Section fits in one chunk
      chunks.push({ text: trimmed, source, path });
    } else {
      // Section too large — split it with word-based chunking
      const subChunks = chunkByWords(trimmed, source, path);
      chunks.push(...subChunks);
    }
  }

  return chunks.length > 0 ? chunks : chunkByWords(text, source, path);
}

/**
 * Selects the appropriate chunking strategy based on file type.
 * Designed to be extended as new file types are supported.
 */
function chunkByStrategy(
  text: string,
  source: string,
  path: string,
  fileType: string
): DocumentChunk[] {
  switch (fileType) {
    case '.md':
      return chunkByHeaders(text, source, path);
    default:
      return chunkByWords(text, source, path);
  }
}

/**
 * Recursively fetches all markdown files from a GitHub folder and subfolders.
 */
async function fetchFilesRecursively(
  owner: string,
  repo: string,
  folderPath: string,
  source: string
): Promise<DocumentChunk[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}`;
  const { data: items } = await axios.get<GitHubFile[]>(apiUrl, { headers: GITHUB_HEADERS });

  const allChunks: DocumentChunk[] = [];

  for (const item of items) {
    if (item.type === 'file' && item.name.endsWith('.md')) {
      const { data: content } = await axios.get<string>(item.download_url);
      const fileExt = item.name.slice(item.name.lastIndexOf('.'));
      const chunks = chunkByStrategy(content, source, item.path, fileExt);
      allChunks.push(...chunks);
      console.log(`  ✓ ${item.path} → ${chunks.length} chunks`);
    } else if (item.type === 'dir') {
      console.log(`  📁 Entering subdirectory: ${item.path}`);
      const subChunks = await fetchFilesRecursively(owner, repo, item.path, source);
      allChunks.push(...subChunks);
    }
  }

  return allChunks;
}

/**
 * Public entry point: fetches and chunks all markdown files
 * from a GitHub repository folder (recursively).
 */
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
