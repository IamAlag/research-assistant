/**
 * Pluggable Vector Store Provider.
 * 
 * Custom in-memory vector store implementation using cosine similarity.
 * This avoids any dependency on specific LangChain vector store packages
 * and gives us full control over the retrieval logic.
 * 
 * Design decision: By implementing our own vector store, we:
 * 1. Eliminate native dependency issues (faiss-node, etc.)
 * 2. Have full control over similarity computation
 * 3. Can easily add MMR, metadata filtering, etc.
 * 4. Can swap to Pinecone/Upstash by implementing the same interface
 */

import { embedQuery, embedDocuments } from './embedding-service';
import type { DocumentChunk } from '@/types/document';
import { loadVectorRecords, saveVectorRecords, isPersistentStorageConfigured } from './persistence-service';

/** A stored vector entry with its embedding and metadata */
interface VectorEntry {
  chunk: DocumentChunk;
  embedding: number[];
}

// Ensure the vector store structures survive HMR reloads
interface GlobalVectorStore {
  vectorEntries: VectorEntry[];
  storedDocumentIds: Set<string>;
  chunkRegistry: Map<string, DocumentChunk>;
  vectorStoreLoaded: boolean;
}

const globalForVectors = globalThis as unknown as GlobalVectorStore;

if (!globalForVectors.vectorEntries) {
  globalForVectors.vectorEntries = [];
}
if (!globalForVectors.storedDocumentIds) {
  globalForVectors.storedDocumentIds = new Set<string>();
}
if (!globalForVectors.chunkRegistry) {
  globalForVectors.chunkRegistry = new Map<string, DocumentChunk>();
}
if (typeof globalForVectors.vectorStoreLoaded !== 'boolean') {
  globalForVectors.vectorStoreLoaded = false;
}

const vectorEntries = globalForVectors.vectorEntries;
const storedDocumentIds = globalForVectors.storedDocumentIds;
const chunkRegistry = globalForVectors.chunkRegistry;
let vectorStoreLoaded = globalForVectors.vectorStoreLoaded;

async function ensureVectorStoreLoaded(): Promise<void> {
  if (vectorStoreLoaded || !isPersistentStorageConfigured()) {
    return;
  }

  const persistedEntries = await loadVectorRecords<VectorEntry>();
  if (persistedEntries && persistedEntries.length > 0) {
    vectorEntries.splice(0, vectorEntries.length, ...persistedEntries);
    storedDocumentIds.clear();
    chunkRegistry.clear();

    for (const entry of vectorEntries) {
      storedDocumentIds.add(entry.chunk.documentId);
      chunkRegistry.set(entry.chunk.chunkId, entry.chunk);
    }
  }

  vectorStoreLoaded = true;
  globalForVectors.vectorStoreLoaded = true;
}

async function persistVectorStore(): Promise<void> {
  if (!isPersistentStorageConfigured()) {
    return;
  }

  await saveVectorRecords(vectorEntries);
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Add document chunks to the vector store.
 * Computes embeddings for each chunk and stores them.
 */
export async function addChunksToStore(chunks: DocumentChunk[]): Promise<void> {
  await ensureVectorStoreLoaded();

  // Compute embeddings for all chunks
  const texts = chunks.map(c => c.content);
  const embeddings = await embedDocuments(texts);

  // Store each chunk with its embedding
  for (let i = 0; i < chunks.length; i++) {
    vectorEntries.push({
      chunk: chunks[i],
      embedding: embeddings[i],
    });
    storedDocumentIds.add(chunks[i].documentId);
    chunkRegistry.set(chunks[i].chunkId, chunks[i]);
  }

  await persistVectorStore();

  console.log(
    `[VectorStore] Added ${chunks.length} chunks from "${chunks[0]?.documentName}". ` +
    `Total: ${vectorEntries.length} vectors`
  );
}

export async function similaritySearch(
  query: string,
  topK: number = 8,
  documentFilter?: string[]
): Promise<Array<{ document: DocumentChunk; score: number }>> {
  await ensureVectorStoreLoaded();

  if (vectorEntries.length === 0) return [];

  // Apply document filter first to avoid unnecessary cosine similarity checks
  let entriesToSearch = vectorEntries;
  if (documentFilter && documentFilter.length > 0) {
    entriesToSearch = vectorEntries.filter(entry => documentFilter.includes(entry.chunk.documentId));
  }

  if (entriesToSearch.length === 0) return [];

  // Embed the query
  const queryEmbedding = await embedQuery(query);

  // Score only the filtered entries
  const scored = entriesToSearch.map(entry => ({
    document: entry.chunk,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  // Sort by score descending and return top-K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Perform MMR (Maximal Marginal Relevance) search.
 * Balances relevance with diversity to reduce redundant results.
 * 
 * MMR formula: argmax[lambda * sim(q, d) - (1 - lambda) * max(sim(d, d_selected))]
 */
export async function mmrSearch(
  query: string,
  topK: number = 8,
  lambda: number = 0.7,
  documentFilter?: string[]
): Promise<Array<{ document: DocumentChunk; score: number }>> {
  await ensureVectorStoreLoaded();

  if (vectorEntries.length === 0) return [];

  // Apply document filter first to avoid unnecessary cosine similarity checks
  let entriesToSearch = vectorEntries;
  if (documentFilter && documentFilter.length > 0) {
    entriesToSearch = vectorEntries.filter(entry => documentFilter.includes(entry.chunk.documentId));
  }

  if (entriesToSearch.length === 0) return [];

  const queryEmbedding = await embedQuery(query);
  const fetchK = Math.min(topK * 3, entriesToSearch.length);

  // Score only the filtered entries by similarity to query
  let candidates = entriesToSearch.map((entry, idx) => ({
    index: idx,
    document: entry.chunk,
    embedding: entry.embedding,
    queryScore: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  // Sort by query similarity and take top fetchK candidates
  candidates.sort((a, b) => b.queryScore - a.queryScore);
  candidates = candidates.slice(0, fetchK);

  // Greedy MMR selection
  const selected: typeof candidates = [];
  const remaining = [...candidates];

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].queryScore;

      // Max similarity to any already-selected document
      let maxDiversity = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(remaining[i].embedding, sel.embedding);
        maxDiversity = Math.max(maxDiversity, sim);
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxDiversity;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected.map((s, i) => ({
    document: s.document,
    score: s.queryScore,
  }));
}

/**
 * Get a chunk by its ID from the registry.
 */
export function getChunkById(chunkId: string): DocumentChunk | undefined {
  return chunkRegistry.get(chunkId);
}

/**
 * Delete all chunks for a specific document.
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  await ensureVectorStoreLoaded();

  // Remove from vector entries
  for (let i = vectorEntries.length - 1; i >= 0; i--) {
    if (vectorEntries[i].chunk.documentId === documentId) {
      vectorEntries.splice(i, 1);
    }
  }

  // Remove from chunk registry
  for (const [chunkId, chunk] of chunkRegistry.entries()) {
    if (chunk.documentId === documentId) {
      chunkRegistry.delete(chunkId);
    }
  }

  storedDocumentIds.delete(documentId);
  await persistVectorStore();
  console.log(`[VectorStore] Deleted chunks for document "${documentId}". Remaining: ${vectorEntries.length}`);
}

/**
 * Get all stored document IDs.
 */
export async function getStoredDocumentIds(): Promise<string[]> {
  await ensureVectorStoreLoaded();
  return Array.from(storedDocumentIds);
}

/**
 * Get the total number of chunks stored.
 */
export function getTotalChunkCount(): number {
  return chunkRegistry.size;
}

/**
 * Check if the vector store has any documents.
 */
export async function hasDocuments(): Promise<boolean> {
  await ensureVectorStoreLoaded();
  return vectorEntries.length > 0;
}

/**
 * Retrieve the first few introductory chunks of a document.
 */
export function getIntroductoryChunks(documentId: string, count: number = 3): DocumentChunk[] {
  if (!vectorStoreLoaded && !isPersistentStorageConfigured()) {
    return vectorEntries
      .filter(entry => entry.chunk.documentId === documentId)
      .map(entry => entry.chunk)
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .slice(0, count);
  }

  return vectorEntries
    .filter(entry => entry.chunk.documentId === documentId)
    .map(entry => entry.chunk)
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .slice(0, count);
}
