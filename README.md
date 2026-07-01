# Agentic Multi-Document Research & Q&A Assistant
<img width="1910" height="962" alt="Screenshot 2026-06-27 234100" src="https://github.com/user-attachments/assets/41747250-696f-43a8-913d-0fcf2423f16b" />

A production-level AI Research Assistant built using **Next.js 16 (App Router)**, **TypeScript**, **TailwindCSS v4**, **LangChain**, and the **Google Gemini API**. 

It uses an advanced agentic loop (Plan → Decompose → Retrieve → Evaluate → Re-retrieve → Synthesize → Cite) to answer complex queries across multiple uploaded documents (PDFs, TXT, and Markdown).

---

## Key Features

*   **Multi-Document Processing**: Drag-and-drop or select multiple PDFs, TXT, and Markdown files simultaneously.
*   **Semantic & Structural Chunking**: Heading-aware recursive text splitting that preserves section hierarchy, page numbers, and provenance.
*   **Advanced Vector Retrieval**: Cosine similarity search combined with **Maximal Marginal Relevance (MMR)** for content diversity, and metadata-filtering.
*   **Agentic Reasoning Loop**: Replaces static single-turn RAG with an active planner-evaluator chain. If initial evidence is weak, the agent automatically runs query refinement and searches again.
*   **Source Citations**: Inline citations mapped directly to source documents with page numbers, section headers, and exact quotations.
*   **Premium Glassmorphic UI**: High-fidelity dark/light mode, animated sidebar, interactive thinking panel (workflows are visible, but raw LLM chain-of-thought is hidden), inline suggested follow-up chips, copyable answers, and smooth Framer Motion micro-animations.

---

## Technical Stack

*   **Framework**: Next.js 16 (App Router)
*   **Language**: TypeScript (strict types)
*   **Styling**: TailwindCSS v4
*   **Agent Orchestration**: LangChain.js & custom workflow loop
*   **Embeddings & Chat Model**: Google Gemini API (`gemini-2.5-flash` / `gemini-embedding-001`)
*   **Animations**: Framer Motion
*   **Icons**: Lucide Icons
*   **Markdown Parsing**: React Markdown with rehype-highlight (code blocks syntax highlighting) & remark-gfm

---

## Project Structure

```
research-assistant/
├── src/
│   ├── app/                    # App Router routes & API endpoints
│   │   ├── api/
│   │   │   ├── chat/           # SSE Streaming Chat route
│   │   │   ├── documents/      # Document catalog management
│   │   │   └── upload/         # Ingestion & Vector indexing route
│   │   ├── globals.css         # Custom tokens & design styles
│   │   ├── layout.tsx          # App container & Error boundaries
│   │   └── page.tsx            # Main workspace page
│   ├── components/             # Reusable UI component modules
│   │   ├── chat/               # Message bubbles, input, citations
│   │   ├── documents/          # Sidebar, upload zone, document list cards
│   │   ├── shared/             # Theme toggler, header, spinners
│   │   └── thinking/           # Reasoning progress steps list
│   ├── lib/
│   │   ├── prompts/            # Stage-specific system instructions
│   │   ├── services/           # Ingestion, vector math, memory, orchestrator
│   │   └── utils/              # Text cleaners, validators, ID generators
│   └── types/                  # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites

*   Node.js v20+
*   Google Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/apikey))

### Installation

1. Clone or navigate to the directory:
   ```bash
   cd research-assistant
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   GOOGLE_API_KEY=your-gemini-api-key-here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to start researching.

---

## Production Readiness

*   **Standalone Build Config**: Configured with `serverExternalPackages: ["pdf-parse"]` to prevent bundling errors on Vercel/serverless environments.
*   **API Timeouts**: Handlers explicitly configured with `maxDuration` limits to permit longer planning loops.
*   **Global Error Handling**: Protected via React client boundaries to recover gracefully from parsing anomalies.

---


The app now persists document metadata and vector entries through Upstash Redis when the two Redis environment variables are present. If those variables are missing, it gracefully falls back to in-memory storage.

That means the Vercel deploy is now good for a real public demo as long as you configure the Redis variables. Without them, the link will still work, but uploaded documents can disappear on cold starts or new serverless instances.
