/**
 * Token counting utilities.
 * 
 * Uses a character-based approximation (4 chars ≈ 1 token for English text).
 * This avoids the overhead of loading a full tokenizer while remaining
 * accurate enough for chunk size estimation and context window management.
 */

/** Average characters per token for English text */
const CHARS_PER_TOKEN = 4;

/**
 * Estimate the token count for a given text string.
 * Uses the industry-standard ~4 characters per token approximation.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check if a text fits within a token budget.
 */
export function fitsInTokenBudget(text: string, maxTokens: number): boolean {
  return estimateTokenCount(text) <= maxTokens;
}

/**
 * Truncate text to fit within a token budget.
 * Tries to break at sentence boundaries for cleaner output.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;

  // Try to break at the last sentence boundary before the limit
  const truncated = text.substring(0, maxChars);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('.\n'),
    truncated.lastIndexOf('? '),
    truncated.lastIndexOf('! ')
  );

  if (lastSentenceEnd > maxChars * 0.8) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  return truncated;
}
