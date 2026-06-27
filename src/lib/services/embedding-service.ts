/**
 * Embedding Service.
 * 
 * Wraps Google Generative AI embeddings with caching to avoid
 * recomputing embeddings for the same content.
 * 
 * Uses gemini-embedding-001 model which produces 768-dimensional vectors.
 */

import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { getConfig } from '@/lib/config';
import { contentHash } from '@/lib/utils/id-generator';

/** In-memory embedding cache: content hash → embedding vector */
const embeddingCache = new Map<string, number[]>();

/** Singleton embeddings instance */
let embeddingsInstance: GoogleGenerativeAIEmbeddings | null = null;

/**
 * Get or create the embeddings model instance.
 */
function getEmbeddingsModel(): GoogleGenerativeAIEmbeddings {
  if (!embeddingsInstance) {
    const config = getConfig();
    embeddingsInstance = new GoogleGenerativeAIEmbeddings({
      apiKey: config.google.apiKey,
      model: config.google.embeddingModel,
    });
  }
  return embeddingsInstance;
}

/**
 * Generate an embedding for a single text query.
 * Uses cache to avoid redundant API calls.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const hash = contentHash(text);
  const cached = embeddingCache.get(hash);
  if (cached) return cached;

  const model = getEmbeddingsModel();
  const embedding = await model.embedQuery(text);
  embeddingCache.set(hash, embedding);
  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 * Uses cache for already-computed embeddings and batches only new ones.
 */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const results: (number[] | null)[] = texts.map(() => null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // Check cache first
  for (let i = 0; i < texts.length; i++) {
    const hash = contentHash(texts[i]);
    const cached = embeddingCache.get(hash);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  // Batch embed uncached texts with safe chunk sizes
  if (uncachedTexts.length > 0) {
    const model = getEmbeddingsModel();
    const batchSize = 16; // Safe batch limit to prevent Google API rate and payload size errors
    const newEmbeddings: number[][] = [];

    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      const batch = uncachedTexts.slice(i, i + batchSize);
      const batchResult = await model.embedDocuments(batch);
      newEmbeddings.push(...batchResult);
    }

    for (let j = 0; j < uncachedIndices.length; j++) {
      const idx = uncachedIndices[j];
      results[idx] = newEmbeddings[j];
      embeddingCache.set(contentHash(uncachedTexts[j]), newEmbeddings[j]);
    }
  }

  const cacheHits = texts.length - uncachedTexts.length;
  if (cacheHits > 0) {
    console.log(`[EmbeddingService] Cache hits: ${cacheHits}/${texts.length}`);
  }

  return results as number[][];
}

/**
 * Get the current cache size (for monitoring).
 */
export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}

/**
 * Clear the embedding cache.
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  console.log('[EmbeddingService] Cache cleared');
}

/**
 * Get the embeddings model instance for use with vector stores.
 * This is needed by LangChain's MemoryVectorStore.
 */
export function getEmbeddingsInstance(): GoogleGenerativeAIEmbeddings {
  return getEmbeddingsModel();
}
