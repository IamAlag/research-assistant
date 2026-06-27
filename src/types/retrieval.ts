/**
 * Retrieval-related type definitions.
 * 
 * These types define the contract for vector search results,
 * scoring, and retrieval configuration.
 */

import type { DocumentChunk } from './document';

/** A chunk with its similarity/relevance score */
export interface ScoredChunk {
  /** The document chunk */
  chunk: DocumentChunk;
  /** Cosine similarity score (0-1, higher = more similar) */
  similarityScore: number;
  /** Re-ranker relevance score (0-1, if re-ranking was applied) */
  rerankerScore?: number;
  /** Final combined score used for ordering */
  finalScore: number;
}

/** Configuration for a retrieval operation */
export interface RetrievalConfig {
  /** Number of results to return */
  topK: number;
  /** Minimum similarity threshold (0-1) */
  similarityThreshold: number;
  /** Whether to use MMR for diversity */
  useMMR: boolean;
  /** MMR lambda parameter (0 = max diversity, 1 = max relevance) */
  mmrLambda: number;
  /** Filter by specific document IDs */
  documentFilter?: string[];
  /** Filter by specific sections */
  sectionFilter?: string[];
  /** Whether to apply re-ranking */
  useReranking: boolean;
}

/** Result of a retrieval operation */
export interface RetrievalResult {
  /** Scored chunks ordered by relevance */
  chunks: ScoredChunk[];
  /** The query that was used */
  query: string;
  /** Total chunks searched */
  totalSearched: number;
  /** Time taken for retrieval in milliseconds */
  retrievalTimeMs: number;
  /** Whether re-ranking was applied */
  wasReranked: boolean;
}

/** Default retrieval configuration */
export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  topK: 8,
  similarityThreshold: 0.3,
  useMMR: false,
  mmrLambda: 0.7,
  useReranking: true,
};
