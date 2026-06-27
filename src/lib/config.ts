/**
 * Centralized application configuration.
 * 
 * All environment variables are validated and typed here.
 * This is the single source of truth for all config values.
 */

/** Validated application configuration */
export interface AppConfig {
  google: {
    apiKey: string;
    chatModel: string;
    embeddingModel: string;
  };
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

/**
 * Get and validate the application configuration from environment variables.
 * Throws descriptive errors for missing required values.
 */
export function getConfig(): AppConfig {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'your_google_api_key_here') {
    throw new Error(
      'GOOGLE_API_KEY is not set. Get your API key at https://aistudio.google.com/apikey ' +
      'and add it to .env.local'
    );
  }

  const groqApiKey = process.env.GROQ_API_KEY || '';

  return {
    google: {
      apiKey,
      chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    },
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
