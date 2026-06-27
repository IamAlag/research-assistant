/**
 * ID generation utilities.
 * 
 * Provides deterministic and random ID generation for documents, chunks,
 * sessions, and messages.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique document ID.
 */
export function generateDocumentId(): string {
  return `doc_${uuidv4().substring(0, 8)}`;
}

/**
 * Generate a unique chunk ID with document context.
 */
export function generateChunkId(documentId: string, chunkIndex: number): string {
  return `${documentId}_chunk_${chunkIndex.toString().padStart(4, '0')}`;
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `session_${uuidv4().substring(0, 12)}`;
}

/**
 * Generate a unique message ID.
 */
export function generateMessageId(): string {
  return `msg_${uuidv4().substring(0, 12)}`;
}

/**
 * Generate a unique step ID for agent thinking steps.
 */
export function generateStepId(): string {
  return `step_${uuidv4().substring(0, 8)}`;
}

/**
 * Generate a content hash for embedding cache keys.
 * Uses a simple FNV-1a hash for speed.
 */
export function contentHash(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
