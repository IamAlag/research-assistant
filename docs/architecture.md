# Architecture and Engineering Notes

This document describes the intended data flow of the Multi-Document Research Assistant and records important trade-offs honestly.

## Request flow

1. A user uploads PDF, TXT, or Markdown files through the upload endpoint.
2. The ingestion path extracts text, splits it into chunks, and associates available provenance metadata.
3. The application creates embeddings and stores chunk vectors plus document metadata.
4. A question enters the retrieval/orchestration workflow.
5. The workflow retrieves candidate chunks using semantic similarity, with MMR and metadata filtering intended to improve relevance and diversity.
6. If the first evidence set is judged weak, the workflow can refine the query and retrieve again.
7. The model synthesizes a response from the selected evidence and returns source references for inspection.

## Main components

- `src/app/api/upload/`: upload and indexing route.
- `src/app/api/chat/`: chat response and streaming route.
- `src/app/api/documents/`: document catalogue operations.
- `src/lib/services/`: ingestion, retrieval, persistence, and orchestration logic.
- `src/lib/prompts/`: prompts used at different workflow stages.
- `src/components/`: interface for uploads, document navigation, chat, citations, and progress.

## Design choices

### Why chunk documents?

An entire book or a large PDF may exceed the context window and contains lots of irrelevant text for any one question. Chunking creates smaller searchable pieces. Chunk size and overlap are trade-offs: small chunks can lose context; large chunks can retrieve irrelevant surrounding material.

### Why embeddings and vector retrieval?

Embeddings represent text as numeric vectors. Comparing vectors helps retrieve passages that are semantically related to a question even when they do not use exactly the same words. Similarity is a ranking signal, not a guarantee that a passage answers the question.

### Why MMR?

The top similarity results can be repetitive. Maximal Marginal Relevance attempts to balance relevance to the query with diversity among selected results, increasing the chance that an answer sees complementary evidence.

### Why iterative retrieval?

A first query may be too broad or use different terms from the source material. Refining the query and searching again can recover useful evidence, at the cost of extra model calls, latency, and provider usage.

## Reliability and security boundaries

- A citation is useful only if it supports the associated claim; citations require evaluation, not just display.
- Retrieved documents are untrusted data. Instructions inside a document must not be treated as system instructions.
- Uploaded files need strict size/type limits and robust parsing protections before the service is exposed to arbitrary users.
- API keys must be provided through environment variables and never committed.
- In-memory storage is not durable. Configure and test the persistent storage path for deployments that need data to survive restarts or serverless cold starts.

## Evaluation plan

A meaningful evaluation set should contain representative questions, expected supporting passages, and questions that are unanswerable from the uploaded corpus. Track at least:

- Retrieval recall / whether the expected evidence is retrieved.
- Citation support / whether cited passages actually support claims.
- Answer correctness and abstention when evidence is missing.
- End-to-end latency and token or provider cost.
- Failure rate for malformed, empty, oversized, or unsupported uploads.

Do not publish benchmark numbers until they have been measured on a repeatable dataset.
