# AI Docs Chatbot

A CLI chatbot that answers questions about Anthropic and OpenAI APIs using a RAG (Retrieval-Augmented Generation) pipeline. Built as an AI Engineering portfolio project.

## How It Works

```
User question
     │
     ▼
Query reformulation        ← Claude rewrites follow-up questions into standalone queries
     │
     ▼
Embedding (Voyage AI)      ← question → vector
     │
     ▼
Vector search (MongoDB)    ← fetch top-10 candidate chunks
     │
     ▼
Reranking (Voyage AI)      ← rerank-2 picks top-3 most relevant chunks
     │
     ▼
Generate answer (Claude)   ← stream the response with retrieved context
```

Multi-turn conversation history is maintained across turns. Follow-up questions like "Can you give an example?" are automatically reformulated before embedding so vector search stays accurate.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| AI | Claude Haiku 4.5 (chat + reformulation) |
| Embeddings | Voyage AI `voyage-3-lite` |
| Reranking | Voyage AI `rerank-2` |
| Vector DB | MongoDB Atlas Vector Search |
| Runtime | Node.js + tsx |

## Project Structure

```
src/
├── config/
│   ├── index.ts          # env validation + all constants (MODELS, RAG, CHUNKING, …)
│   └── sources.ts        # GitHub repos and files to ingest
├── types/
│   └── index.ts          # shared TypeScript interfaces
├── services/
│   ├── ragService.ts     # main RAG pipeline
│   ├── documentLoader.ts # GitHub fetching + chunking for .md and .ipynb files
│   ├── embeddings.ts     # Voyage AI embedding, cosine similarity, reranking
│   └── vectorStore.ts    # MongoDB insert, search, clear
├── utils/
│   └── retry.ts          # exponential backoff for API calls
├── scripts/
│   ├── chat.ts           # interactive CLI chat
│   ├── ingest.ts         # fetch docs → embed → store in MongoDB
│   ├── evaluate.ts       # RAG quality evaluation
│   └── testCases.ts      # evaluation test cases
└── debug/
    ├── test-embeddings.ts  # cosine similarity smoke test
    ├── test-vectorstore.ts # MongoDB insert/search smoke test
    ├── check-courses.ts    # inspect GitHub repo contents
    └── check-repos.ts      # inspect GitHub repo contents
```

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/oksanalutsyk/ai-docs-chatbot.git
cd ai-docs-chatbot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `VOYAGE_API_KEY` | [dash.voyageai.com](https://dashboard.voyageai.com) |
| `MONGODB_URI` | [cloud.mongodb.com](https://cloud.mongodb.com) — Atlas cluster connection string |
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) — optional, raises rate limit from 60 to 5000 req/hr |

### 3. Set up MongoDB Atlas Vector Search

Create a vector search index on your `documents` collection with this definition:

```json
{
  "fields": [{
    "type": "vector",
    "path": "embedding",
    "numDimensions": 1024,
    "similarity": "cosine"
  }]
}
```

### 4. Ingest documentation

Fetches markdown and Jupyter notebook files from GitHub and stores embeddings in MongoDB:

```bash
npm run ingest
```

Sources are configured in `src/config/sources.ts` — add new repos or files there.

### 5. Chat

```bash
npm run chat
```

Type your question and press Enter. Type `exit` to quit.

Each query prints step-by-step timing so you can see where the pipeline spends time:

```
🔍 Searching docs...
[15:21:15] Reformulating question... (5ms)
[15:21:17] Embedded (2797ms)
[15:21:21] Found 10 candidates (3430ms)
[15:21:21] Reranked (520ms)
[15:21:21] Generating answer...
[15:21:26] Done (4994ms)
```

## Scripts

| Command | Description |
|---|---|
| `npm run chat` | Start the interactive CLI chatbot |
| `npm run ingest` | Fetch docs from GitHub, embed, and store in MongoDB |
| `npm run evaluate` | Run RAG quality evaluation against test cases |
| `npm run build` | Compile TypeScript |
| `npm run debug:embeddings` | Cosine similarity smoke test |
| `npm run debug:vectorstore` | MongoDB insert/search smoke test |

## Evaluation

The evaluation script runs 5 standalone questions and a 3-turn conversation test, reporting similarity scores and keyword coverage:

```
Total tests:   5
Passed:        5/5 (100%)
Avg top score: 0.789

🌟 EXCELLENT — Production-ready RAG quality
```

Test cases are defined in `src/scripts/testCases.ts`.

## Document Corpus

- **Anthropic:** anthropic-cookbook (patterns), courses (API fundamentals + prompt engineering notebooks)
- **OpenAI:** openai-cookbook (articles, vector databases, evaluation examples), openai-python

Both `.md` and `.ipynb` (Jupyter notebook) files are supported. Notebooks are converted to text — markdown cells kept as-is, code cells wrapped in fenced code blocks — then chunked the same way as markdown. Total corpus: ~1,269 chunks.

Chunking strategy: files are split by `##`/`###` headers to preserve semantic boundaries; plain text falls back to word-based chunking with overlap.
