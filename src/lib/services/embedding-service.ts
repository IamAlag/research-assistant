/**
 * Embedding Service.
 * 
 * Uses Google Generative AI embeddings when available, with a deterministic
 * local fallback so uploads still work when the Google API key is invalid.
 */

import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { getConfig } from '@/lib/config';
import { contentHash } from '@/lib/utils/id-generator';

/** In-memory embedding cache: content hash → embedding vector */
const embeddingCache = new Map<string, number[]>();

type EmbeddingModel = {
  embedQuery: (text: string) => Promise<number[]>;
  embedDocuments: (texts: string[]) => Promise<number[][]>;
};

/** Singleton embeddings instance */
let embeddingsInstance: EmbeddingModel | null = null;
let localFallbackLogged = false;

const EMBEDDING_DIMENSIONS = 768;

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createLocalEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) || [];

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = hash % EMBEDDING_DIMENSIONS;
    const weight = 1 + (token.length % 7) / 10;
    vector[index] += weight;

    const secondIndex = (index + Math.floor(hash / EMBEDDING_DIMENSIONS)) % EMBEDDING_DIMENSIONS;
    vector[secondIndex] += weight * 0.35;
  }

  return normalizeVector(vector);
}

function getLocalFallbackModel(): EmbeddingModel {
  if (!localFallbackLogged) {
    localFallbackLogged = true;
    console.warn('[EmbeddingService] Using local fallback embeddings because Gemini embeddings failed or are unavailable.');
  }

  return {
    async embedQuery(text: string): Promise<number[]> {
      return createLocalEmbedding(text);
    },
    async embedDocuments(texts: string[]): Promise<number[][]> {
      return texts.map((text) => createLocalEmbedding(text));
    },
  };
}

/**
 * Get or create the embeddings model instance.
 */
function getEmbeddingsModel(): EmbeddingModel {
  if (!embeddingsInstance) {
    const config = getConfig();
    const googleEmbeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: config.google.apiKey,
      model: config.google.embeddingModel,
    });

    embeddingsInstance = {
      async embedQuery(text: string): Promise<number[]> {
        try {
          return await googleEmbeddings.embedQuery(text);
        } catch (error) {
          console.warn('[EmbeddingService] Gemini embedQuery failed, falling back to local embeddings:', error);
          embeddingsInstance = getLocalFallbackModel();
          return embeddingsInstance.embedQuery(text);
        }
      },
      async embedDocuments(texts: string[]): Promise<number[][]> {
        try {
          return await googleEmbeddings.embedDocuments(texts);
        } catch (error) {
          console.warn('[EmbeddingService] Gemini embedDocuments failed, falling back to local embeddings:', error);
          embeddingsInstance = getLocalFallbackModel();
          return embeddingsInstance.embedDocuments(texts);
        }
      },
    };
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
    const batchSize = 64; // Larger batch size to reduce API round-trips during upload ingestion
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
export function getEmbeddingsInstance(): EmbeddingModel {
  return getEmbeddingsModel();
}
