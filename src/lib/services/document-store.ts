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
  documentStoreLoaded: boolean;
};

const documentStore = globalForDocs.documentStore ?? new Map<string, DocumentMetadata>();
let documentStoreLoaded = globalForDocs.documentStoreLoaded ?? false;

globalForDocs.documentStore = documentStore;
globalForDocs.documentStoreLoaded = documentStoreLoaded;

async function ensureDocumentStoreLoaded(): Promise<void> {
  if (documentStoreLoaded || !isPersistentStorageConfigured()) {
    return;
  }

  const persistedDocuments = await loadDocumentRecords<DocumentMetadata>();
  if (persistedDocuments && persistedDocuments.length > 0) {
    documentStore.clear();
    for (const metadata of persistedDocuments) {
      documentStore.set(metadata.id, metadata);
    }
  }

  documentStoreLoaded = true;
  globalForDocs.documentStoreLoaded = true;
}

async function persistDocumentStore(): Promise<void> {
  if (!isPersistentStorageConfigured()) {
    return;
  }

  await saveDocumentRecords(Array.from(documentStore.values()));
}

export async function addDocument(metadata: DocumentMetadata): Promise<void> {
  await ensureDocumentStoreLoaded();
  documentStore.set(metadata.id, metadata);
  await persistDocumentStore();
}

export async function getDocument(id: string): Promise<DocumentMetadata | undefined> {
  await ensureDocumentStoreLoaded();
  return documentStore.get(id);
}

export async function getAllDocuments(): Promise<DocumentMetadata[]> {
  await ensureDocumentStoreLoaded();
  return Array.from(documentStore.values())
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export async function deleteDocument(id: string): Promise<boolean> {
  await ensureDocumentStoreLoaded();
  const deleted = documentStore.delete(id);
  if (deleted) {
    await persistDocumentStore();
  }
  return deleted;
}

export async function getDocumentCount(): Promise<number> {
  await ensureDocumentStoreLoaded();
  return documentStore.size;
}

export async function getDocumentList(): Promise<Array<{ id: string; fileName: string; title: string }>> {
  await ensureDocumentStoreLoaded();
  return Array.from(documentStore.values()).map(d => ({
    id: d.id,
    fileName: d.fileName,
    title: d.title,
  }));
}
