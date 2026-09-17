import axios from 'axios';
import { CHUNKING, GITHUB_HEADERS } from '../config';
import type { DocumentChunk, GitHubFile } from '../types';

// ─── Jupyter notebook types ───────────────────────────────────────────────────

interface NotebookCell {
  cell_type: 'markdown' | 'code' | 'raw';
  source: string[] | string;
}

interface JupyterNotebook {
  cells: NotebookCell[];
  metadata?: {
    kernelspec?: { language?: string };
  };
}

// ─── Chunking strategies ──────────────────────────────────────────────────────

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
  const sections = text.split(/\n(?=#{2,3}\s)/);

  if (sections.length <= 1) {
    return chunkByWords(text, source, path);
  }

  const chunks: DocumentChunk[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < CHUNKING.minChunkLength) continue;

    const wordCount = trimmed.split(/\s+/).length;

    if (wordCount <= CHUNKING.chunkSize) {
      chunks.push({ text: trimmed, source, path });
    } else {
      const subChunks = chunkByWords(trimmed, source, path);
      chunks.push(...subChunks);
    }
  }

  return chunks.length > 0 ? chunks : chunkByWords(text, source, path);
}

/**
 * Extracts text from a Jupyter notebook (.ipynb) and chunks it.
 * Markdown cells are included as-is; code cells are wrapped in code fences.
 * The combined text is then split by headers (same strategy as .md files).
 */
function parseNotebook(content: string, source: string, path: string): DocumentChunk[] {
  const notebook = JSON.parse(content) as JupyterNotebook;
  const language = notebook.metadata?.kernelspec?.language ?? 'python';

  const text = notebook.cells
    .filter((cell) => cell.cell_type === 'markdown' || cell.cell_type === 'code')
    .map((cell) => {
      const src = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      if (!src.trim()) return '';
      if (cell.cell_type === 'code') return `\`\`\`${language}\n${src}\n\`\`\``;
      return src;
    })
    .filter(Boolean)
    .join('\n\n');

  return chunkByHeaders(text, source, path);
}

/**
 * Selects the appropriate chunking strategy based on file extension.
 */
function chunkByStrategy(
  text: string,
  source: string,
  path: string,
  fileExt: string
): DocumentChunk[] {
  switch (fileExt) {
    case '.md':
      return chunkByHeaders(text, source, path);
    case '.ipynb':
      return parseNotebook(text, source, path);
    default:
      return chunkByWords(text, source, path);
  }
}

// ─── GitHub fetching ──────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = ['.md', '.ipynb'];

/**
 * Recursively fetches all supported files from a GitHub folder and subfolders.
 * Supports: .md (markdown) and .ipynb (Jupyter notebooks).
 */
async function fetchFilesRecursively(
  owner: string,
  repo: string,
  folderPath: string,
  source: string
): Promise<DocumentChunk[]> {
  const encodedPath = folderPath.split('/').map(encodeURIComponent).join('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
  const { data: items } = await axios.get<GitHubFile[]>(apiUrl, { headers: GITHUB_HEADERS });

  const allChunks: DocumentChunk[] = [];

  for (const item of items) {
    const ext = item.name.slice(item.name.lastIndexOf('.'));
    if (item.type === 'file' && SUPPORTED_EXTENSIONS.includes(ext)) {
      const { data: content } = await axios.get<string>(item.download_url, { responseType: 'text' });
      const chunks = chunkByStrategy(content, source, item.path, ext);
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
 * Public entry point: fetches and chunks all supported files
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
