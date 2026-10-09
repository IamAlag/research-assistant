# Start Here: Learn This Project Without Getting Overwhelmed

Welcome! This guide is for understanding the project, not memorising buzzwords. Read it in order and try one small thing at a time.

## 1. What does this project do?

Imagine you have 20 PDFs and want to ask: **"What do these documents say about battery recycling?"**

Instead of asking a chatbot to guess from general knowledge, this app lets you upload documents, searches their text for useful passages, and asks a language model to write an answer based on the passages. It can show source references so you can inspect the evidence.

That general pattern is called **retrieval-augmented generation (RAG)**.

## 2. The whole journey in plain English

1. **Upload:** You choose a PDF, text file, or Markdown file.
2. **Extract text:** The server reads the file's text.
3. **Split into chunks:** Long text is broken into smaller passages. A chunk is like one index card from a book.
4. **Represent chunks as numbers:** The current embedding service creates a numeric vector for each passage. Important project detail: the current implementation is a deterministic, token-hashing fallback, not a hosted modern semantic-embedding model. It is useful for demonstrating vector plumbing, but it can miss meaning and synonyms.
5. **Store the chunks:** The app keeps chunk text and metadata in its storage layer. The code has in-memory and optional persistent-storage paths; in-memory data is temporary.
6. **Ask a question:** The app plans a search, retrieves likely useful chunks, and evaluates whether the evidence is enough.
7. **Try again if needed:** The orchestration code can refine retrieval within a limited number of rounds.
8. **Write an answer:** A chat model generates a response using the retrieved evidence.
9. **Show progress and sources:** The UI streams status events and the answer as they arrive.

A useful mental model: **search finds the evidence; the language model writes using that evidence.** Neither step guarantees the answer is correct.

## 3. What is RAG?

RAG stands for **Retrieval-Augmented Generation**:
- **Retrieval** = find relevant passages from your files.
- **Augmented** = give those passages to the model as extra context.
- **Generation** = ask the model to compose an answer.

Example: If a document says "The pilot began in March", a grounded answer should use that passage rather than inventing a date.

RAG is not model training. Uploading a document does not permanently teach the base model new knowledge; the app searches the document when you ask questions.

## 4. Vocabulary cheat sheet

| Term | Plain-English meaning |
|---|---|
| Frontend | The part you see and click in the browser. |
| Backend / API route | Server-side code that receives a request and does the work. |
| Next.js | The web framework joining the React interface and server routes. |
| React | A library for building interface components. |
| TypeScript | JavaScript with extra type checks that help catch mistakes. |
| LLM | A large language model that reads and generates text. |
| Prompt | Instructions and context sent to the model. |
| Chunk | A smaller passage extracted from a longer document. |
| Embedding | A list of numbers used to represent text for comparison. |
| Vector search | Ranking stored vectors by similarity to a query vector. |
| Retrieval | Selecting passages that may help answer a question. |
| Reranking / MMR | Methods for improving the relevance or variety of selected passages. |
| Hallucination | An answer detail that sounds plausible but is unsupported or false. |
| Citation / provenance | Information showing which source a claim came from. |
| Streaming | Sending pieces of the answer as they become available, instead of waiting for the entire answer. |
| SSE | Server-Sent Events, a web format for streaming server-to-browser events. |
| Environment variable | A setting supplied outside the source code, often for secrets or configuration. |
| CI | Continuous Integration: automatically running checks when code changes. |
| Lint | A tool that flags suspicious or inconsistent code patterns. |
| Type-check | Checks TypeScript types without needing to run the app. |
| Build | Packages the app and checks whether it can be compiled for deployment. |

## 5. Where should I look in the code?

Start with these files; do not try to understand every file at once.

| File or folder | What it is responsible for |
|---|---|
| `src/app/page.tsx` | Main page and high-level UI. |
| `src/components/chat/` | Chat input, messages, citations, and chat presentation. |
| `src/components/documents/` | Upload area and document list UI. |
| `src/app/api/upload/route.ts` | Server endpoint for uploading and ingesting documents. |
| `src/app/api/chat/route.ts` | Receives a chat question and streams workflow events to the browser. |
| `src/lib/services/agent-orchestrator.ts` | Coordinates planning, retrieval, evidence checks, and answer generation. |
| `src/lib/services/llm-service.ts` | Calls the chat models through Groq. |
| `src/lib/services/embedding-service.ts` | Turns text into numeric vectors; currently uses a local token-hashing method. |
| `src/lib/services/retrieval-service.ts` | Finds useful chunks for a question. |
| `src/lib/config.ts` | Reads configuration and environment variables. |
| `.github/workflows/ci.yml` | Runs lint, type-checking, and build checks on GitHub. |

## 6. Run it locally

### What you need

- Node.js 22 is the version used by the GitHub CI workflow.
- npm.
- A Groq API key for language-model calls.

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/IamAlag/research-assistant.git
   cd research-assistant
   ```
2. Install dependencies:
   ```bash
   npm ci --legacy-peer-deps
   ```
3. Create a file named `.env.local` in the project root and put your own key inside:
   ```dotenv
   GROQ_API_KEY=your_real_key_here
   GROQ_CHAT_MODEL=llama-3.3-70b-versatile
   ```
   Never paste a real key into GitHub, a screenshot, or a commit.
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000 in your browser.
6. Upload a small, non-sensitive PDF or text file and ask a question whose answer you can verify manually.

If the app says `GROQ_API_KEY is not set`, check the spelling and that `.env.local` is in the repository root. Restart the development server after changing environment variables.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the local development server. |
| `npm run lint` | Checks code style and common mistakes. |
| `npx tsc --noEmit` | Checks TypeScript types. |
| `npm run build` | Builds the app as a deployment check. |

## 7. What happens when you send a question?

The chat API is `POST /api/chat`. It validates that the message is not empty, creates or reuses a session ID, then calls `processQuestion()` in the orchestrator. That function yields events such as progress updates and answer chunks. The API formats them as Server-Sent Events so the frontend can display progress without waiting for the entire run.

The important engineering idea is **separation of responsibilities**: the API handles HTTP and streaming; the orchestrator coordinates the workflow; smaller services handle model calls, retrieval, storage, and embeddings.

## 8. Important limitations to understand honestly

- The local token-hashing vectors are not equivalent to a high-quality semantic embedding model. A sensible next experiment is to compare retrieval quality against a real embedding model.
- Retrieved text may be relevant without actually proving an answer. Citations need to be checked.
- The language model can still hallucinate or misunderstand source material.
- In-memory storage may disappear when the server restarts or a serverless instance changes.
- Uploaded files are untrusted input. Do not use confidential documents with an unreviewed deployment.
- A green build means the code passed those checks; it does not prove the product is secure, correct, or production-ready.

## 9. A 5-session learning plan

- [ ] **Session 1:** Run the app and learn the folder map.
- [ ] **Session 2:** Read `src/app/api/chat/route.ts` and explain request → response in your own words.
- [ ] **Session 3:** Read the orchestrator and draw the question-answer flow.
- [ ] **Session 4:** Learn chunking, embeddings, retrieval, and why the current embedding approach has limits.
- [ ] **Session 5:** Add one small test or improvement, run lint/type-check/build, and write down what changed.

## 10. Can I explain this in an interview?

Try this in your own words:

> "I built a document research assistant using Next.js and TypeScript. It ingests documents, splits extracted text into chunks, retrieves passages for a user's question, and uses a language model to produce a source-aware answer. The chat endpoint streams progress and answer events to the frontend. One trade-off I understand is that retrieval quality depends heavily on the embedding and ranking approach, so I would evaluate it on a labelled question set before making accuracy claims."

Do not claim the system is always accurate or that the current local embeddings understand meaning like a modern embedding API. Knowing the limitation and explaining how you would measure it is a strength.

## Next reading

- [Architecture notes](architecture.md) — design and trade-offs.
- [Repository README](../README.md) — project overview and setup.
