/**
 * Shared Document Store.
 * 
 * Persistent document metadata store shared across API routes and client requests.
 * Uses globalThis to survive Hot Module Replacement (HMR) in development mode.
 */

import type { DocumentMetadata } from '@/types/document';
import { loadDocumentRecords, saveDocumentRecords, isPersistentStorageConfigured } from './persistence-service';

// Ensure the map survives HMR reloads
const globalForDocs = globalThis as unknown as {
  documentStore: Map<string, DocumentMetadata>;
};

const documentStore = globalForDocs.documentStore ?? new Map<string, DocumentMetadata>();

globalForDocs.documentStore = documentStore;

async function refreshDocumentStore(): Promise<void> {
  if (!isPersistentStorageConfigured()) {
    return;
  }

  const persistedDocuments = await loadDocumentRecords<DocumentMetadata>();
  documentStore.clear();

  if (persistedDocuments && persistedDocuments.length > 0) {
    for (const metadata of persistedDocuments) {
      documentStore.set(metadata.id, metadata);
    }
  }
}

async function persistDocumentStore(): Promise<void> {
  if (!isPersistentStorageConfigured()) {
    return;
  }

  await saveDocumentRecords(Array.from(documentStore.values()));
}

export async function addDocument(metadata: DocumentMetadata): Promise<void> {
  await refreshDocumentStore();
  documentStore.set(metadata.id, metadata);
  await persistDocumentStore();
}

export async function getDocument(id: string): Promise<DocumentMetadata | undefined> {
  await refreshDocumentStore();
  return documentStore.get(id);
}

export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  await refreshDocumentStore();
  return Array.from(documentStore.values())
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function deleteDocument(id: string): Promise<boolean> {
  await refreshDocumentStore();
  const deleted = documentStore.delete(id);
  if (deleted) {
    await persistDocumentStore();
  }
  return deleted;
}

export async function getDocumentCount(): Promise<number> {
  await refreshDocumentStore();
  return documentStore.size;
}

export async function getDocumentList(): Promise<Array<{ id: string; fileName: string; title: string }>> {
  await refreshDocumentStore();
  return Array.from(documentStore.values()).map(d => ({
    id: d.id,
    fileName: d.fileName,
    title: d.title,
  }));
}
