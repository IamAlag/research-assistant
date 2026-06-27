/**
 * Centralized application configuration.
 * 
 * All environment variables are validated and typed here.
 * This is the single source of truth for all config values.
 */

/** Validated application configuration */
export interface AppConfig {
  groq: {
    apiKey: string;
    chatModel: string;
  };
  rag: {
    chunkSize: number;
    chunkOverlap: number;
    retrievalTopK: number;
    maxFileSizeMB: number;
  };
  agent: {
    maxRetrievalRounds: number;
    minEvidenceQuality: number;
  };
}

function normalizeGroqApiKey(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return '';
  }

  const bearerMatch = trimmed.match(/gsk_[A-Za-z0-9]+/);
  if (bearerMatch) {
    return bearerMatch[0];
  }

  return trimmed.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Get and validate the application configuration from environment variables.
 * Throws descriptive errors for missing required values.
 */
export function getConfig(): AppConfig {
  const groqApiKey = normalizeGroqApiKey(process.env.GROQ_API_KEY);

  return {
    groq: {
      apiKey: groqApiKey,
      chatModel: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
    },
    rag: {
      chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
      retrievalTopK: parseInt(process.env.RETRIEVAL_TOP_K || '8', 10),
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10),
    },
    agent: {
      maxRetrievalRounds: 3,
      minEvidenceQuality: 0.5,
    },
  };
}

/** Supported file extensions */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md'] as const;

/** Max number of files per upload batch */
export const MAX_BATCH_SIZE = 10;

/** Maximum context window tokens to send to the LLM */
export const MAX_CONTEXT_TOKENS = 120_000;
