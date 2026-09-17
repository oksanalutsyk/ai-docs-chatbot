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
Vector search (MongoDB)    ← find top-5 similar chunks from the doc corpus
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
| Vector DB | MongoDB Atlas Vector Search |
| HTTP | Axios |
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
│   ├── documentLoader.ts # GitHub fetching + markdown-aware chunking
│   ├── embeddings.ts     # Voyage AI embedding + cosine similarity
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

Fetches markdown files from GitHub and stores embeddings in MongoDB:

```bash
npm run ingest
```

Sources are configured in `src/config/sources.ts` — add new repos or files there.

### 5. Chat

```bash
npm run chat
```

Type your question and press Enter. Type `exit` to quit.

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

- **Anthropic:** anthropic-cookbook, anthropic-sdk-python, claude-cookbooks, courses
- **OpenAI:** openai-cookbook, openai-python

Chunking strategy: markdown files are split by `##`/`###` headers to preserve semantic boundaries; plain text falls back to word-based chunking with overlap.
