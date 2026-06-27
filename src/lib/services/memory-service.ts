/**
 * Chat Memory Service.
 * 
 * Manages per-session conversation history with sliding window context.
 * Stores chat history, referenced documents, and supports context
 * persistence for conversational follow-up questions.
 */

import type { ChatMessage } from '@/types/chat';

/** Maximum messages to keep in history per session */
const MAX_HISTORY_MESSAGES = 20;

/** In-memory session store */
const sessions = new Map<string, {
  messages: ChatMessage[];
  documentIds: Set<string>;
  createdAt: string;
  updatedAt: string;
}>();

/**
 * Get or create a session.
 */
function getOrCreateSession(sessionId: string) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [],
      documentIds: new Set(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return sessions.get(sessionId)!;
}

/**
 * Add a message to the session history.
 */
export function addMessage(sessionId: string, message: ChatMessage): void {
  const session = getOrCreateSession(sessionId);
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();

  // Trim to max history size (keep system messages)
  if (session.messages.length > MAX_HISTORY_MESSAGES) {
    const systemMessages = session.messages.filter(m => m.role === 'system');
    const nonSystemMessages = session.messages.filter(m => m.role !== 'system');
    session.messages = [
      ...systemMessages,
      ...nonSystemMessages.slice(-MAX_HISTORY_MESSAGES + systemMessages.length),
    ];
  }
}

/**
 * Get the conversation history for a session.
 * Returns messages formatted for LLM context injection.
 */
export function getHistory(sessionId: string): ChatMessage[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return [...session.messages];
}

/**
 * Get the last N messages as a formatted context string.
 */
export function getFormattedHistory(sessionId: string, maxMessages: number = 6): string {
  const history = getHistory(sessionId);
  if (history.length === 0) return '';

  const recent = history.slice(-maxMessages);
  return recent
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

/**
 * Track a document as referenced in this session.
 */
export function addDocumentReference(sessionId: string, documentId: string): void {
  const session = getOrCreateSession(sessionId);
  session.documentIds.add(documentId);
}

/**
 * Get all document IDs referenced in a session.
 */
export function getReferencedDocuments(sessionId: string): string[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return Array.from(session.documentIds);
}

/**
 * Clear a session's history.
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get all active session IDs.
 */
export function getActiveSessionIds(): string[] {
  return Array.from(sessions.keys());
}
