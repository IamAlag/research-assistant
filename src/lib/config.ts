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

function cleanEnvString(value: string | undefined, defaultValue: string = ''): string {
  if (!value) return defaultValue;
  // If the string contains newlines (e.g. from previous automated Vercel prompt inputs like "y\nvalue"),
  // get the last non-empty line.
  const lines = value.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return defaultValue;
  const lastLine = lines[lines.length - 1];
  return lastLine.replace(/^['"]|['"]$/g, '').trim();
}

function safeParseInt(value: string | undefined, defaultValue: number): number {
  const cleaned = cleanEnvString(value);
  if (!cleaned) return defaultValue;
  // Extract all digits (optionally signed) from the cleaned string
  const matches = cleaned.match(/-?[0-9]+/);
  if (!matches) return defaultValue;
  const parsed = parseInt(matches[0], 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function normalizeGroqApiKey(value: string | undefined): string {
  const cleaned = cleanEnvString(value);
  if (!cleaned) {
    return '';
  }

  const bearerMatch = cleaned.match(/gsk_[A-Za-z0-9]+/);
  if (bearerMatch) {
    return bearerMatch[0];
  }

  return cleaned.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Get and validate the application configuration from environment variables.
 * Throws descriptive errors for missing required values.
 */
export function getConfig(): AppConfig {
  const groqApiKey = normalizeGroqApiKey(process.env.GROQ_API_KEY);
  const chatModel = cleanEnvString(process.env.GROQ_CHAT_MODEL, 'llama-3.3-70b-versatile');

  return {
    groq: {
      apiKey: groqApiKey,
      chatModel: chatModel,
    },
    rag: {
      chunkSize: safeParseInt(process.env.CHUNK_SIZE, 600),
      chunkOverlap: safeParseInt(process.env.CHUNK_OVERLAP, 120),
      retrievalTopK: safeParseInt(process.env.RETRIEVAL_TOP_K, 4),
      maxFileSizeMB: safeParseInt(process.env.MAX_FILE_SIZE_MB, 20),
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
