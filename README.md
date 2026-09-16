# AI Docs Assistant

A CLI chatbot that answers questions about Anthropic and OpenAI APIs using streaming responses and multi-turn conversation history.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **AI:** Anthropic Claude (claude-haiku-4-5)
- **Streaming:** Server-Sent Events via Anthropic SDK

## Project Structure
src/
├── config/ # Environment validation
├── services/ # Claude API logic
├── types/ # TypeScript interfaces
└── index.ts # CLI entry point

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/oksanalutsyk/ai-docs-chatbot.git
cd ai-docs-chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Add your API key from [console.anthropic.com](https://console.anthropic.com):
ANTHROPIC_API_KEY=your-api-key-here

Add your API key from [dash.voyageai.com](https://dashboard.voyageai.com/organization/projects):
VOYAGE_API_KEY=your-voyage-key-here


### 4. Run

```bash
npx tsx src/index.ts
```

## Available Commands

| Command  | Description                    |
|----------|--------------------------------|
| `/help`  | Show available commands        |
| `/clear` | Clear conversation history     |
| `/exit`  | Quit the program               |

## Example Usage
AI Docs Assistant — Anthropic & OpenAI Documentation
Type /help for available commands

You: What is streaming in the Anthropic API?
You: Can you show me a code example?
You: /clear
You: /exit


## Roadmap

- [ ] Week 2: Embeddings with Voyage AI
- [ ] Week 3: MongoDB Atlas Vector Search
- [ ] Week 4: Document ingestion (Anthropic + OpenAI Cookbooks)
- [ ] Week 5: Hybrid retrieval pipeline
- [ ] Week 6: RAG pipeline + Express API + UI
- [ ] Week 7: Evaluation metrics (faithfulness, relevancy, recall)
- [ ] Week 8: Deploy to Railway