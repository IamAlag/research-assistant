/**
 * Document Upload API Route.
 * 
 * POST /api/upload
 * 
 * Accepts multipart form data with one or more files (PDF, TXT, MD).
 * Processes each file through the document pipeline and stores
 * the resulting chunks in the vector store.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/lib/services/document-processor';
import { addChunksToStore } from '@/lib/services/vector-store-provider';
import { updateDocumentList } from '@/lib/services/agent-orchestrator';
import { addDocument, getDocumentList } from '@/lib/services/document-store';
import type { UploadResult } from '@/types/document';

/** Maximum request duration (60 seconds for large files) */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const results: UploadResult[] = [];

    for (const file of files) {
      if (!(file instanceof File)) {
        results.push({
          success: false,
          document: null,
          error: 'Invalid file entry',
          processingTimeMs: 0,
        });
        continue;
      }

      const startTime = Date.now();

      try {
        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process through the document pipeline
        const { metadata, chunks } = await processDocument(file.name, buffer);

        // Store chunks in vector store
        await addChunksToStore(chunks);

        // Store metadata in shared store
        await addDocument(metadata);

        // Update agent's document list
        updateDocumentList(await getDocumentList());

        results.push({
          success: true,
          document: metadata,
          processingTimeMs: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          success: false,
          document: null,
          error: error instanceof Error ? error.message : 'Processing failed',
          processingTimeMs: Date.now() - startTime,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Upload processing failed' },
      { status: 500 }
    );
  }
}
