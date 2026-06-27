/**
 * Document Processing Service.
 * 
 * Handles the full document ingestion pipeline:
 * 1. Text extraction (PDF, TXT, Markdown)
 * 2. Text cleaning (artifact removal, normalization)
 * 3. Intelligent chunking (heading-aware, with overlap)
 * 4. Metadata enrichment (page numbers, sections, token counts)
 * 
 * Design decision: We use RecursiveCharacterTextSplitter with heading-aware
 * separators instead of semantic chunking. Research shows this approach is
 * competitive with semantic chunking for most document types, without the
 * latency cost of per-sentence embedding calls.
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { getConfig } from '@/lib/config';
import { cleanText, getSectionAtOffset, estimatePageNumber } from '@/lib/utils/text-cleaner';
import { estimateTokenCount } from '@/lib/utils/token-counter';
import { validateFile, validateExtractedText, getFileExtension } from '@/lib/utils/file-validator';
import { generateDocumentId, generateChunkId } from '@/lib/utils/id-generator';
import type { DocumentMetadata, DocumentChunk, UploadResult, SupportedFileType } from '@/types/document';

/**
 * Process an uploaded file through the full ingestion pipeline.
 * Returns the document metadata and enriched chunks ready for embedding.
 */
export async function processDocument(
  fileName: string,
  fileBuffer: Buffer
): Promise<{ metadata: DocumentMetadata; chunks: DocumentChunk[] }> {
  const config = getConfig();
  const startTime = Date.now();

  // Step 1: Validate file
  const validation = validateFile(fileName, fileBuffer.length, config.rag.maxFileSizeMB);
  if (!validation.valid || !validation.fileType) {
    throw new Error(validation.error || 'File validation failed');
  }

  const fileType = validation.fileType;
  const documentId = generateDocumentId();

  // Step 2: Extract text
  const { text, pageCount } = await extractText(fileBuffer, fileType);

  // Step 3: Validate extracted text
  const textValidation = validateExtractedText(text);
  if (!textValidation.valid) {
    throw new Error(textValidation.error || 'Text extraction failed');
  }

  // Step 4: Clean text
  const cleanedText = cleanText(text);

  // Step 5: Extract title
  const title = extractTitle(cleanedText, fileName);

  // Step 6: Chunk the text with heading-aware splitting
  const chunks = await chunkDocument(
    cleanedText,
    documentId,
    fileName,
    pageCount,
    config.rag.chunkSize,
    config.rag.chunkOverlap
  );

  // Step 7: Build metadata
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const metadata: DocumentMetadata = {
    id: documentId,
    fileName,
    fileType,
    fileSize: fileBuffer.length,
    pageCount,
    chunkCount: chunks.length,
    totalTokens,
    uploadedAt: new Date().toISOString(),
    title,
  };

  const processingTime = Date.now() - startTime;
  console.log(
    `[DocumentProcessor] Processed "${fileName}": ${pageCount} pages, ${chunks.length} chunks, ` +
    `${totalTokens} tokens in ${processingTime}ms`
  );

  return { metadata, chunks };
}

/**
 * Extract raw text from a file buffer based on its type.
 */
async function extractText(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<{ text: string; pageCount: number }> {
  switch (fileType) {
    case 'pdf':
      return extractPdfText(buffer);
    case 'txt':
    case 'md':
      return {
        text: buffer.toString('utf-8'),
        pageCount: 1,
      };
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 * Handles corrupted PDFs gracefully.
 */
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require('pdf-parse');
    
    // Check if it's the newer class-based pdf-parse v2
    if (pdf.PDFParse) {
      const uint8Array = new Uint8Array(buffer);
      const parser = new pdf.PDFParse(uint8Array);
      
      const resultObj = await parser.getText();
      const info = await parser.load();
      const numpages = info.numPages || 1;
      
      return {
        text: resultObj.text || '',
        pageCount: numpages,
      };
    } else {
      // Fallback to pdf-parse v1
      const data = await pdf(buffer);
      return {
        text: data.text,
        pageCount: data.numpages || 1,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse PDF: ${message}. The file may be corrupted or password-protected.`);
  }
}

/**
 * Extract a title from the document content.
 * Tries to find a heading; falls back to the filename.
 */
function extractTitle(text: string, fileName: string): string {
  // Try to find a Markdown heading
  const h1Match = text.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  // Try the first line if it looks like a title (< 100 chars, no period)
  const firstLine = text.split('\n').find(l => l.trim().length > 0);
  if (firstLine && firstLine.trim().length < 100 && !firstLine.includes('.')) {
    return firstLine.trim();
  }

  // Fall back to filename without extension
  const ext = getFileExtension(fileName);
  return fileName.replace(ext, '').replace(/[-_]/g, ' ').trim();
}

/**
 * Chunk a document using heading-aware recursive splitting.
 * 
 * The separator hierarchy prioritizes splitting at structural boundaries:
 * 1. Section headings (## , ### )
 * 2. Paragraph breaks (\n\n)
 * 3. Line breaks (\n)
 * 4. Sentence boundaries (. )
 * 5. Word boundaries ( )
 * 
 * Each chunk is enriched with metadata about its position, section, and token count.
 */
async function chunkDocument(
  text: string,
  documentId: string,
  documentName: string,
  totalPages: number,
  chunkSize: number,
  chunkOverlap: number
): Promise<DocumentChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: [
      '\n## ',     // H2 headings
      '\n### ',    // H3 headings
      '\n#### ',   // H4 headings
      '\n\n',      // Paragraph breaks
      '\n',        // Line breaks
      '. ',        // Sentence boundaries
      '? ',        // Question marks
      '! ',        // Exclamation marks
      '; ',        // Semicolons
      ', ',        // Commas
      ' ',         // Words
      '',          // Characters (last resort)
    ],
    keepSeparator: true,
  });

  // Create a LangChain Document for splitting
  const doc = new Document({
    pageContent: text,
    metadata: { documentId, documentName },
  });

  const splitDocs = await splitter.splitDocuments([doc]);

  // Enrich each chunk with metadata
  const chunks: DocumentChunk[] = splitDocs.map((splitDoc, index) => {
    const content = splitDoc.pageContent;

    // Find the offset of this chunk in the original text
    const startOffset = text.indexOf(content);
    const endOffset = startOffset + content.length;

    return {
      chunkId: generateChunkId(documentId, index),
      documentId,
      documentName,
      content,
      pageNumber: estimatePageNumber(text, Math.max(0, startOffset), totalPages),
      sectionHeading: getSectionAtOffset(text, Math.max(0, startOffset)),
      chunkIndex: index,
      tokenCount: estimateTokenCount(content),
      startOffset: Math.max(0, startOffset),
      endOffset: Math.max(0, endOffset),
    };
  });

  return chunks;
}

/**
 * Process multiple files concurrently.
 * Returns results for all files, including failures.
 */
export async function processMultipleDocuments(
  files: Array<{ fileName: string; buffer: Buffer }>
): Promise<UploadResult[]> {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const startTime = Date.now();
      try {
        const { metadata, chunks } = await processDocument(file.fileName, file.buffer);
        return {
          success: true,
          document: metadata,
          processingTimeMs: Date.now() - startTime,
          chunks,
        };
      } catch (error) {
        return {
          success: false,
          document: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
          chunks: [],
        };
      }
    })
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return {
        success: result.value.success,
        document: result.value.document,
        error: result.value.error,
        processingTimeMs: result.value.processingTimeMs,
      };
    }
    return {
      success: false,
      document: null,
      error: 'Unexpected processing error',
      processingTimeMs: 0,
    };
  });
}
