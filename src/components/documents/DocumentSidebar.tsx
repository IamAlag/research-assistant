'use client';

/**
 * DocumentSidebar — Animated sidebar listing uploaded documents.
 * Contains the file upload zone and document cards.
 */

import { FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUploadZone from './FileUploadZone';
import DocumentCard from './DocumentCard';
import type { DocumentMetadata } from '@/types/document';

interface DocumentSidebarProps {
  documents: DocumentMetadata[];
  isOpen: boolean;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
  onUploadComplete: () => void;
  onDeleteDocument: (id: string) => void;
}

export default function DocumentSidebar({
  documents,
  isOpen,
  isUploading,
  setIsUploading,
  onUploadComplete,
  onDeleteDocument,
}: DocumentSidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-full border-r border-[var(--border-color)] bg-[var(--bg-secondary)]
                     overflow-hidden shrink-0"
          id="document-sidebar"
        >
          <div className="w-[300px] h-full flex flex-col">
            {/* Sidebar header */}
            <div className="p-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={16} className="text-[var(--color-primary-400)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Documents</h2>
                {documents.length > 0 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full
                                   bg-[var(--color-primary-500)]/15 text-[var(--color-primary-400)]
                                   font-medium">
                    {documents.length}
                  </span>
                )}
              </div>
              <FileUploadZone
                onUploadComplete={onUploadComplete}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
              />
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {documents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--color-glass-light)] 
                                    flex items-center justify-center mx-auto mb-3">
                      <FolderOpen size={20} className="text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      No documents yet
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                      Upload files to start researching
                    </p>
                  </motion.div>
                ) : (
                  documents.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onDelete={onDeleteDocument}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar footer stats */}
            {documents.length > 0 && (() => {
              const totalChunks = documents.reduce((s, d) => s + d.chunkCount, 0);
              const totalTokens = documents.reduce((s, d) => s + d.totalTokens, 0);
              const totalMinutes = Math.ceil(totalTokens / 150);
              const hours = Math.floor(totalMinutes / 60);
              const mins = totalMinutes % 60;
              const readingTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

              const topics = new Set<string>();
              documents.forEach(doc => {
                const name = doc.fileName.toLowerCase();
                const title = (doc.title || '').toLowerCase();
                const text = `${name} ${title}`;
                
                if (text.includes('agent') || text.includes('tool') || text.includes('energy') || text.includes('2606')) {
                  topics.add('AI Agents');
                }
                if (text.includes('security') || text.includes('inject') || text.includes('iject') || text.includes('attack') || text.includes('vulner')) {
                  topics.add('AI Security');
                }
                if (text.includes('adversar') || text.includes('evolut') || text.includes('nlp') || text.includes('classif') || text.includes('natural language')) {
                  topics.add('Adversarial NLP');
                }
                if (text.includes('eval') || text.includes('bench') || text.includes('task') || text.includes('hiring') || text.includes('resume') || text.includes('screening')) {
                  topics.add('Benchmarks');
                }
              });
              if (topics.size === 0) {
                topics.add('Document Synthesis');
                topics.add('Semantic Q&A');
              }

              return (
                <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/40 space-y-3.5">
                  <p className="text-[10px] font-bold text-[var(--color-primary-400)] uppercase tracking-wider">
                    📊 Research Workspace
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-secondary)]">
                    <div className="p-2 rounded-lg bg-[var(--color-glass-light)] border border-[var(--border-color)]">
                      <p className="text-[var(--text-tertiary)] uppercase font-semibold text-[8px]">Papers</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{documents.length}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-glass-light)] border border-[var(--border-color)]">
                      <p className="text-[var(--text-tertiary)] uppercase font-semibold text-[8px]">Chunks</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{totalChunks}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--color-glass-light)] border border-[var(--border-color)] col-span-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[var(--text-tertiary)] uppercase font-semibold text-[8px]">Total Tokens</p>
                          <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{totalTokens.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[var(--text-tertiary)] uppercase font-semibold text-[8px]">Est. Reading Time</p>
                          <p className="text-xs font-bold text-[var(--color-accent-400)] mt-0.5">{readingTime}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Research Domains
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(topics).map((topic, i) => (
                        <span 
                          key={i} 
                          className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-primary-500)]/10 
                                     border border-[var(--color-primary-500)]/20 text-[var(--color-primary-300)]"
                        >
                          • {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
