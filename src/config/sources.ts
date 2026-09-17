/**
 * Documentation sources for ingestion.
 * Add new sources here — no need to touch ingest.ts logic.
 */

/** A GitHub folder to fetch recursively (all .md files inside) */
export interface FolderSource {
  owner: string;
  repo: string;
  folder: string;
  source: string;
}

/** A single GitHub file to fetch via the GitHub API */
export interface FileSource {
  apiUrl: string;
  source: string;
}

const GITHUB_REPOS_API = 'https://api.github.com/repos';

/** Folders ingested recursively — uses markdown-aware chunking */
export const FOLDER_SOURCES: FolderSource[] = [
  { owner: 'anthropics', repo: 'anthropic-cookbook', folder: 'patterns', source: 'anthropic-docs' },
  { owner: 'openai', repo: 'openai-cookbook', folder: 'articles', source: 'openai-docs' },
  { owner: 'openai', repo: 'openai-cookbook', folder: 'examples/vector_databases', source: 'openai-docs' },
  { owner: 'openai', repo: 'openai-cookbook', folder: 'examples/evaluation', source: 'openai-docs' },
];

/** Individual markdown files fetched via GitHub Contents API */
export const FILE_SOURCES: FileSource[] = [
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/courses/contents/anthropic_api_fundamentals/README.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/courses/contents/prompt_engineering_interactive_tutorial/README.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/courses/contents/real_world_prompting/README.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/courses/contents/tool_use/README.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/anthropic-sdk-python/contents/helpers.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/anthropic-sdk-python/contents/api.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/claude-cookbooks/contents/claude_agent_sdk/README.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/anthropics/claude-cookbooks/contents/capabilities/README.md`, source: 'anthropic-docs' },
  { apiUrl: `${GITHUB_REPOS_API}/openai/openai-python/contents/README.md`, source: 'openai-docs' },
];
