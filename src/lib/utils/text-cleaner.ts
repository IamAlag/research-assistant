/**
 * Text cleaning utilities.
 * 
 * Normalizes extracted text to ensure consistent chunking and retrieval quality.
 * Handles common PDF extraction artifacts, encoding issues, and formatting problems.
 */

/**
 * Clean extracted text by removing artifacts and normalizing formatting.
 * This is critical for PDF-extracted text which often contains broken lines,
 * extra whitespace, and control characters.
 */
export function cleanText(text: string): string {
  let cleaned = text;

  // Remove null bytes and control characters (except newlines and tabs)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize Unicode whitespace characters to standard spaces
  cleaned = cleaned.replace(/[\u00A0\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g, ' ');

  // Fix hyphenated line breaks (common in PDFs): "compre-\nhensive" → "comprehensive"
  cleaned = cleaned.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');

  // Collapse multiple spaces into one
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n');

  // Collapse 3+ newlines into 2 (preserve paragraph boundaries)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace from each line
  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract section headings from text.
 * Supports Markdown-style headings and ALL-CAPS headings common in PDFs.
 */
export function extractSectionHeadings(text: string): string[] {
  const headings: string[] = [];

  // Markdown headings: # Heading, ## Heading, etc.
  const mdMatches = text.matchAll(/^(#{1,6})\s+(.+)$/gm);
  for (const match of mdMatches) {
    headings.push(match[2].trim());
  }

  // ALL-CAPS lines that look like section headings (3+ words, no punctuation at end)
  const capsMatches = text.matchAll(/^([A-Z][A-Z\s]{10,})$/gm);
  for (const match of capsMatches) {
    headings.push(match[1].trim());
  }

  return headings;
}

/**
 * Determine which section a given text offset falls under.
 * Returns the most recent heading before the offset.
 */
export function getSectionAtOffset(text: string, offset: number): string {
  const textBefore = text.substring(0, offset);
  const lines = textBefore.split('\n');

  // Walk backwards to find the nearest heading
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    // Markdown heading
    if (/^#{1,6}\s+/.test(line)) {
      return line.replace(/^#{1,6}\s+/, '').trim();
    }
    // ALL-CAPS heading
    if (/^[A-Z][A-Z\s]{10,}$/.test(line)) {
      return line.trim();
    }
  }

  return 'Introduction';
}

/**
 * Estimate the page number for a given character offset in text.
 * Uses a heuristic based on form feed characters (\f) or character count.
 */
export function estimatePageNumber(text: string, offset: number, totalPages: number): number {
  const textBefore = text.substring(0, offset);

  // If the text contains form feed characters (PDF page breaks)
  const formFeedCount = (textBefore.match(/\f/g) || []).length;
  if (formFeedCount > 0) {
    return Math.min(formFeedCount + 1, totalPages);
  }

  // Fallback: estimate based on character position ratio
  if (totalPages <= 1) return 1;
  const ratio = offset / text.length;
  return Math.max(1, Math.min(Math.ceil(ratio * totalPages), totalPages));
}
