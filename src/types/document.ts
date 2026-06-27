/**
 * Document-related type definitions.
 * 
 * These types represent the lifecycle of a document from upload through
 * processing, chunking, and storage in the vector store.
 */

/** Supported file types for upload */
export type SupportedFileType = 'pdf' | 'txt' | 'md';

/** Metadata extracted from an uploaded document */
export interface DocumentMetadata {
  /** Unique identifier for the document */
  id: string;
  /** Original filename */
  fileName: string;
  /** Detected file type */
  fileType: SupportedFileType;
  /** File size in bytes */
  fileSize: number;
  /** Total number of pages (PDF only, 1 for text files) */
  pageCount: number;
  /** Total number of chunks created */
  chunkCount: number;
  /** Total token count across all chunks */
  totalTokens: number;
  /** Upload timestamp */
  uploadedAt: string;
  /** Auto-generated document summary */
  summary?: string;
  /** Extracted title (from first heading or filename) */
  title: string;
}

/** A single chunk of a processed document with full provenance */
export interface DocumentChunk {
  /** Unique chunk identifier */
  chunkId: string;
  /** Parent document ID */
  documentId: string;
  /** Parent document filename */
  documentName: string;
  /** The text content of this chunk */
  content: string;
  /** Page number this chunk originated from (1-indexed) */
  pageNumber: number;
  /** Section heading this chunk falls under */
  sectionHeading: string;
  /** Sequential index within the document */
  chunkIndex: number;
  /** Estimated token count for this chunk */
  tokenCount: number;
  /** Character start offset in the original document */
  startOffset: number;
  /** Character end offset in the original document */
  endOffset: number;
}

/** Result of a document upload and processing operation */
export interface UploadResult {
  /** Whether processing succeeded */
  success: boolean;
  /** The processed document metadata (null on failure) */
  document: DocumentMetadata | null;
  /** Error message if processing failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/** Status of an ongoing upload */
export interface UploadProgress {
  /** File being uploaded */
  fileName: string;
  /** Current stage */
  stage: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'complete' | 'error';
  /** Progress percentage (0-100) */
  progress: number;
  /** Error message if stage is 'error' */
  error?: string;
}
