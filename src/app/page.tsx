'use client';

/**
 * Main Application Page.
 * 
 * 3-column layout:
 * - Left: Document sidebar (collapsible)
 * - Center: Chat interface
 * - Right: Thinking/Search panel (collapsible)
 * 
 * This is the primary integration point where all components,
 * state management, and API calls come together.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Brain as ThinkingIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/shared/Header';
import DocumentSidebar from '@/components/documents/DocumentSidebar';
import ChatContainer from '@/components/chat/ChatContainer';
import ThinkingPanel from '@/components/thinking/ThinkingPanel';
import type { DocumentMetadata } from '@/types/document';
import type { ChatMessage, ThinkingStep, Citation, StreamEvent } from '@/types/chat';
import type { ScoredChunk } from '@/types/retrieval';
import { generateMessageId } from '@/lib/utils/id-generator';

export default function HomePage() {
  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [thinkingOpen, setThinkingOpen] = useState(false);

  // Document state
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Thinking panel state
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [searchResults, setSearchResults] = useState<ScoredChunk[]>([]);

  // Track the last user message for regeneration
  const lastUserMessageRef = useRef<string>('');

  /**
   * Fetch the document list from the server.
   */
  const refreshDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  }, []);

  // Fetch documents on mount
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  /**
   * Delete a document.
   */
  const handleDeleteDocument = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }, []);

  /**
   * Send a message and process the streaming response.
   */
  const handleSendMessage = useCallback(async (content: string) => {
    if (isLoading) return;

    lastUserMessageRef.current = content;
    setIsLoading(true);
    setThinkingSteps([]);
    setSearchResults([]);
    setSuggestedQuestions([]);

    // Add user message
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Open thinking panel automatically
    setThinkingOpen(true);

    // Create placeholder assistant message
    const assistantId = generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
      citations: [],
      thinkingSteps: [],
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      const collectedCitations: Citation[] = [];
      const collectedSteps: ThinkingStep[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const event: StreamEvent = JSON.parse(jsonStr);

            switch (event.type) {
              case 'thinking': {
                const step = event.data as ThinkingStep;
                setThinkingSteps(prev => {
                  const existing = prev.findIndex(s => s.id === step.id);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = step;
                    return updated;
                  }
                  return [...prev, step];
                });
                collectedSteps.push(step);
                break;
              }

              case 'content': {
                const chunk = event.data as string;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: msg.content + chunk }
                      : msg
                  )
                );
                break;
              }

              case 'citations': {
                const citations = event.data as Citation[];
                collectedCitations.push(...citations);
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, citations: collectedCitations }
                      : msg
                  )
                );

                // Convert citations to search results for thinking panel
                const results: ScoredChunk[] = citations.map(c => ({
                  chunk: {
                    chunkId: c.chunkId,
                    documentId: c.documentId,
                    documentName: c.documentName,
                    content: c.quotation,
                    pageNumber: c.pageNumber,
                    sectionHeading: c.sectionHeading,
                    chunkIndex: 0,
                    tokenCount: 0,
                    startOffset: 0,
                    endOffset: 0,
                  },
                  similarityScore: c.relevanceScore,
                  finalScore: c.relevanceScore,
                }));
                setSearchResults(results);
                break;
              }

              case 'suggestions': {
                const suggestions = event.data as string[];
                setSuggestedQuestions(suggestions);
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, suggestedQuestions: suggestions }
                      : msg
                  )
                );
                break;
              }

              case 'error': {
                const errorData = event.data as { message: string };
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: `⚠️ Error: ${errorData.message}`, isStreaming: false }
                      : msg
                  )
                );
                break;
              }

              case 'done': {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, isStreaming: false, thinkingSteps: collectedSteps }
                      : msg
                  )
                );
                break;
              }
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred';
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: `⚠️ ${errorMsg}`, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  /**
   * Regenerate the last assistant response.
   */
  const handleRegenerate = useCallback(() => {
    if (lastUserMessageRef.current && !isLoading) {
      // Remove the last assistant message
      setMessages(prev => {
        const lastAssistantIdx = prev.map(m => m.role).lastIndexOf('assistant');
        if (lastAssistantIdx >= 0) {
          return prev.slice(0, lastAssistantIdx);
        }
        return prev;
      });
      handleSendMessage(lastUserMessageRef.current);
    }
  }, [isLoading, handleSendMessage]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        documentCount={documents.length}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Document Sidebar */}
        <DocumentSidebar
          documents={documents}
          isOpen={sidebarOpen}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          onUploadComplete={refreshDocuments}
          onDeleteDocument={handleDeleteDocument}
        />

        {/* Center — Chat */}
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          hasDocuments={documents.length > 0}
          onSend={handleSendMessage}
          onRegenerate={handleRegenerate}
          suggestedQuestions={suggestedQuestions}
        />

        {/* Right toggle button */}
        {!thinkingOpen && (
          <motion.button
            onClick={() => setThinkingOpen(true)}
            className="absolute right-4 top-16 z-40 p-2 rounded-lg glass
                       text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                       transition-colors"
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            id="open-thinking-panel"
          >
            <ThinkingIcon size={16} />
          </motion.button>
        )}

        {/* Right — Thinking Panel */}
        <ThinkingPanel
          steps={thinkingSteps}
          searchResults={searchResults}
          isOpen={thinkingOpen}
          onClose={() => setThinkingOpen(false)}
        />
      </div>
    </div>
  );
}
