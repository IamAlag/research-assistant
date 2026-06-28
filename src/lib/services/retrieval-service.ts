/**
 * Retrieval Service.
 * 
 * Orchestrates the retrieval pipeline:
 * 1. Similarity search or MMR search
 * 2. Score thresholding
 * 3. Keyword-based re-ranking
 * 4. Result formatting with full chunk metadata
 */

import { similaritySearch, mmrSearch, getIntroductoryChunks } from './vector-store-provider';
import type { RetrievalConfig, RetrievalResult, ScoredChunk } from '@/types/retrieval';
import { DEFAULT_RETRIEVAL_CONFIG } from '@/types/retrieval';

/**
 * Retrieve relevant chunks for a query using the configured strategy.
 */
export async function retrieveChunks(
  query: string,
  config: Partial<RetrievalConfig> = {}
): Promise<RetrievalResult> {
  const startTime = Date.now();
  const mergedConfig: RetrievalConfig = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };

  // Step 1: Search using the appropriate strategy
  const searchResults = mergedConfig.useMMR
    ? await mmrSearch(query, mergedConfig.topK, mergedConfig.mmrLambda, mergedConfig.documentFilter)
    : await similaritySearch(query, mergedConfig.topK, mergedConfig.documentFilter);

  // Step 2: Convert to ScoredChunks
  let scoredChunks: ScoredChunk[] = searchResults
    .map(result => ({
      chunk: result.document,
      similarityScore: result.score,
      finalScore: result.score,
    }))
    // Filter by similarity threshold
    .filter(sc => sc.similarityScore >= mergedConfig.similarityThreshold);

  // Step 3: Re-rank if enabled
  if (mergedConfig.useReranking && scoredChunks.length > 1) {
    scoredChunks = reRankChunks(query, scoredChunks);
  }

  // Step 4: Limit to topK after re-ranking
  scoredChunks = scoredChunks.slice(0, mergedConfig.topK);

  const retrievalTimeMs = Date.now() - startTime;

  console.log(
    `[RetrievalService] "${query.substring(0, 50)}..." → ` +
    `${scoredChunks.length} chunks in ${retrievalTimeMs}ms`
  );

  return {
    chunks: scoredChunks,
    query,
    totalSearched: searchResults.length,
    retrievalTimeMs,
    wasReranked: mergedConfig.useReranking,
  };
}

/**
 * Re-rank chunks using keyword overlap and position heuristics.
 */
function reRankChunks(query: string, chunks: ScoredChunk[]): ScoredChunk[] {
  const queryTerms = new Set(
    query.toLowerCase().split(/\s+/).filter(t => t.length > 2)
  );

  return chunks
    .map(sc => {
      const contentLower = sc.chunk.content.toLowerCase();

      // Keyword overlap score
      let matchCount = 0;
      for (const term of queryTerms) {
        if (contentLower.includes(term)) matchCount++;
      }
      const keywordScore = queryTerms.size > 0 ? matchCount / queryTerms.size : 0;

      // Length penalty: penalize very short chunks
      const lengthFactor = Math.min(1, sc.chunk.content.length / 100);

      // Combine scores
      const rerankerScore = (keywordScore * 0.3 + lengthFactor * 0.1);
      const finalScore = sc.similarityScore * 0.6 + rerankerScore;

      return { ...sc, rerankerScore, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Retrieve chunks for multiple queries (for sub-question decomposition).
 * Deduplicates results across queries.
 */
export async function retrieveForMultipleQueries(
  queries: string[],
  config: Partial<RetrievalConfig> = {}
): Promise<RetrievalResult> {
  const startTime = Date.now();
  const allChunks = new Map<string, ScoredChunk>();

  for (const query of queries) {
    const result = await retrieveChunks(query, config);
    for (const sc of result.chunks) {
      const existing = allChunks.get(sc.chunk.chunkId);
      if (!existing || sc.finalScore > existing.finalScore) {
        allChunks.set(sc.chunk.chunkId, sc);
      }
    }
  }

  const mergedChunks = Array.from(allChunks.values())
    .sort((a, b) => b.finalScore - a.finalScore);

  return {
    chunks: mergedChunks,
    query: queries.join(' | '),
    totalSearched: mergedChunks.length,
    retrievalTimeMs: Date.now() - startTime,
    wasReranked: true,
  };
}

/**
 * Retrieve a balanced set of top chunks from each document separately.
 * This prevents a single document from dominating the context window.
 */
export async function retrieveBalancedAcrossDocuments(
  query: string,
  documentIds: string[],
  config: Partial<RetrievalConfig> = {}
): Promise<RetrievalResult> {
  const startTime = Date.now();
  const mergedConfig: RetrievalConfig = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  
  // Always retrieve at least 3 chunks per document to guarantee coverage
  const chunksPerDoc = Math.max(3, Math.ceil(mergedConfig.topK / Math.max(1, documentIds.length)));
  const allChunks: ScoredChunk[] = [];
  
  console.log(`[RetrievalService] BDR: ${documentIds.length} docs × ${chunksPerDoc} chunks each`);

  for (const docId of documentIds) {
    // Use a very low threshold for per-document retrieval so local embeddings
    // don't accidentally filter out an entire paper on broad queries
    const docResult = await retrieveChunks(query, {
      ...mergedConfig,
      topK: chunksPerDoc,
      similarityThreshold: 0.01,
      documentFilter: [docId],
      useReranking: true,
    });

    if (docResult.chunks.length > 0) {
      console.log(`[RetrievalService] BDR: doc ${docId} → ${docResult.chunks.length} chunks`);
      allChunks.push(...docResult.chunks);
    } else {
      // Absolute fallback: grab the first chunks of the paper
      const fallbackChunks = getIntroductoryChunks(docId, chunksPerDoc);
      console.log(`[RetrievalService] BDR fallback: doc ${docId} → ${fallbackChunks.length} intro chunks`);
      allChunks.push(
        ...fallbackChunks.map((chunk) => ({
          chunk,
          similarityScore: 0.15,
          finalScore: 0.15,
        }))
      );
    }
  }

  // Sort globally by finalScore descending
  const sortedChunks = allChunks.sort((a, b) => b.finalScore - a.finalScore);

  return {
    chunks: sortedChunks,
    query,
    totalSearched: sortedChunks.length,
    retrievalTimeMs: Date.now() - startTime,
    wasReranked: true,
  };
}
