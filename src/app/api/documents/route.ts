/**
 * Documents API Route.
 * 
 * GET /api/documents  — List all uploaded documents
 * DELETE /api/documents?id=xxx — Remove a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteDocumentChunks } from '@/lib/services/vector-store-provider';
import { updateDocumentList } from '@/lib/services/agent-orchestrator';
import { getAllDocuments, getDocument, deleteDocument, getDocumentList } from '@/lib/services/document-store';

export async function GET() {
  const documents = await getAllDocuments();
  return NextResponse.json({ documents });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  if (!documentId) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    );
  }

  const doc = await getDocument(documentId);
  if (!doc) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  try {
    // Remove from vector store
    await deleteDocumentChunks(documentId);

    // Remove from shared metadata store
    await deleteDocument(documentId);

    // Update agent's document list
    updateDocumentList(await getDocumentList());

    return NextResponse.json({
      success: true,
      message: `Document "${doc.fileName}" removed successfully`,
    });
  } catch (error) {
    console.error('[Documents API] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
