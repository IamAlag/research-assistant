/**
 * File validation utilities.
 * 
 * Validates uploaded files for type, size, and content integrity
 * before processing.
 */

import { SUPPORTED_EXTENSIONS } from '@/lib/config';
import type { SupportedFileType } from '@/types/document';

/** File validation result */
export interface FileValidation {
  valid: boolean;
  error?: string;
  fileType?: SupportedFileType;
}

/**
 * Validate an uploaded file for type and size constraints.
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  maxSizeMB: number
): FileValidation {
  // Check file extension
  const ext = getFileExtension(fileName);
  if (!SUPPORTED_EXTENSIONS.includes(ext as typeof SUPPORTED_EXTENSIONS[number])) {
    return {
      valid: false,
      error: `Unsupported file type "${ext}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (fileSize > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maximum: ${maxSizeMB}MB`,
    };
  }

  // Check for empty files
  if (fileSize === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return {
    valid: true,
    fileType: extensionToType(ext),
  };
}

/**
 * Get the file extension from a filename.
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Map file extension to SupportedFileType.
 */
function extensionToType(ext: string): SupportedFileType {
  switch (ext) {
    case '.pdf': return 'pdf';
    case '.txt': return 'txt';
    case '.md': return 'md';
    default: return 'txt';
  }
}

/**
 * Validate that extracted text content is usable.
 * Catches cases where PDF extraction produces garbage.
 */
export function validateExtractedText(text: string): FileValidation {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: 'No text could be extracted from this file. It may be a scanned/image PDF.',
    };
  }

  // Check if the text is mostly garbage (high ratio of non-printable chars)
  const printableRatio = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length / text.length;
  if (printableRatio < 0.5) {
    return {
      valid: false,
      error: 'Extracted text appears to be corrupted or non-readable.',
    };
  }

  return { valid: true };
}
