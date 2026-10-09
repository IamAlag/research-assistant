# Interview Notes: Multi-Document Research Assistant

Use this as a revision sheet, not a script to memorise. Be ready to point to the code and explain the trade-offs.

## 30-second explanation

"I built a full-stack document research assistant. Users upload PDFs, text, or Markdown files, then ask questions across those documents. The backend retrieves relevant passages, runs a multi-step workflow to judge whether it has enough evidence, and streams a source-aware answer to a Next.js/TypeScript interface."

## Two-minute explanation

"The project explores retrieval-augmented generation. On upload, documents are parsed and divided into chunks so the app can search smaller passages rather than send whole documents to a model. When a user asks a question, the orchestrator plans the search, retrieves candidate chunks, evaluates the evidence, and may try another retrieval round before generating the answer. The chat API streams workflow events to the browser using Server-Sent Events, so the user sees progress while work is happening.

I separated the API route, orchestration logic, retrieval service, embedding service, and UI components so each part has a clearer responsibility. The main limitation I would tackle next is retrieval quality: the current embedding implementation is a deterministic local token-hashing method, so I would benchmark it against a real semantic embedding model and measure whether expected source passages are retrieved."

## Architecture in one line

Browser UI → Next.js API route → agent orchestrator → retrieval + language-model services → answer and citations streamed back to the UI.

## Questions to practise

### What is RAG?
Retrieval-augmented generation. Search a knowledge source, provide relevant passages to a language model, then generate an answer using that context.

### Why chunk documents?
Large documents are too long and contain irrelevant information. Chunks make it possible to retrieve only the passages likely to help. Chunk size and overlap trade off context against precision.

### What is an embedding?
A numeric representation of text used for comparisons. In this repository, be precise: the current implementation hashes tokens into a fixed-size vector locally. It is not a hosted semantic embedding model, so it has important quality limits.

### What is the difference between retrieval and generation?
Retrieval selects evidence from stored material. Generation uses a language model to write an answer. Retrieval can return the wrong passage; generation can misinterpret good passages.

### Why stream the answer?
Users get feedback before the whole response is ready. The chat route uses Server-Sent Events to send structured events to the frontend.

### How would you evaluate the system?
Create a repeatable set of questions, expected evidence passages, and unanswerable questions. Measure whether the expected evidence is retrieved, whether citations support claims, answer correctness, abstention quality, latency, and provider cost.

### What would you improve next?
1. Replace or compare the local hashed vectors with a proper semantic embedding model.
2. Add tests for parsing, retrieval, citation support, and API error cases.
3. Evaluate with a labelled dataset rather than anecdotal demos.
4. Add stricter upload validation, rate limits, and operational logging before public deployment.
5. Measure latency and model cost.

## Be accurate about these claims

- Do say the app is a portfolio prototype, not a security-audited production service.
- Do say citations make answers easier to inspect; do not say citations guarantee correctness.
- Do not claim the model was trained on uploaded files.
- Do not claim retrieval is semantically strong without benchmark results.
- Do not invent accuracy, latency, or cost numbers. Measure them first.

## Practice checklist

- [ ] Explain the project without reading the README.
- [ ] Draw the request flow on paper.
- [ ] Explain chunking and embeddings with a simple example.
- [ ] Name one limitation and one way to measure it.
- [ ] Run lint, type-check, and build successfully.
