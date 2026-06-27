'use client';

/**
 * ThinkingPanel — Expandable panel showing the agent's reasoning steps.
 * 
 * Displays the agentic workflow: Planning → Searching → Evaluating → Synthesizing
 * Each step shows its status (active/complete) with appropriate icons.
 */

import { useState } from 'react';
import { Brain, Search, CheckCircle2, Loader2, AlertTriangle, ChevronRight, 
         Target, Sparkles, RotateCcw, ListChecks, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThinkingStep } from '@/types/chat';
import type { ScoredChunk } from '@/types/retrieval';

interface ThinkingPanelProps {
  steps: ThinkingStep[];
  searchResults: ScoredChunk[];
  isOpen: boolean;
  onClose: () => void;
}

const stepIcons: Record<string, React.ReactNode> = {
  planning: <Target size={14} />,
  decomposing: <ListChecks size={14} />,
  searching: <Search size={14} />,
  evaluating: <CheckCircle2 size={14} />,
  're-searching': <RotateCcw size={14} />,
  synthesizing: <Sparkles size={14} />,
  complete: <CheckCircle2 size={14} />,
};

const stepColors: Record<string, string> = {
  planning: 'text-blue-400',
  decomposing: 'text-purple-400',
  searching: 'text-cyan-400',
  evaluating: 'text-amber-400',
  're-searching': 'text-orange-400',
  synthesizing: 'text-emerald-400',
  complete: 'text-green-400',
};

export default function ThinkingPanel({ steps, searchResults, isOpen, onClose }: ThinkingPanelProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-full border-l border-[var(--border-color)] bg-[var(--bg-secondary)]
                     overflow-hidden shrink-0"
          id="thinking-panel"
        >
          <div className="w-[340px] h-full flex flex-col">
            {/* Panel header */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-[var(--color-primary-400)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Reasoning
                </h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--color-glass-light)]
                                                     text-[var(--text-tertiary)] transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Thinking Steps */}
              {steps.length > 0 ? (
                <div className="p-4 space-y-1">
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-start gap-2.5 py-2"
                    >
                      {/* Status indicator */}
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'active' ? (
                          <Loader2 size={14} className="text-[var(--color-primary-400)] animate-spin" />
                        ) : step.status === 'error' ? (
                          <AlertTriangle size={14} className="text-[var(--color-error-400)]" />
                        ) : (
                          <div className={stepColors[step.type] || 'text-[var(--text-tertiary)]'}>
                            {stepIcons[step.type] || <ChevronRight size={14} />}
                          </div>
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${
                          step.status === 'active'
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Brain size={24} className="text-[var(--text-tertiary)] mx-auto mb-2 opacity-30" />
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Ask a question to see the reasoning process
                  </p>
                </div>
              )}

              {/* Search Results Section */}
              {searchResults.length > 0 && (
                <div className="border-t border-[var(--border-color)]">
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="w-full flex items-center justify-between p-4 text-left
                               hover:bg-[var(--color-glass-light)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-[var(--color-primary-400)]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Retrieved Chunks ({searchResults.length})
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-[var(--text-tertiary)] transition-transform ${
                        showSearch ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {showSearch && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {searchResults.map((sc, i) => (
                            <div
                              key={sc.chunk.chunkId}
                              className="p-2.5 rounded-lg bg-[var(--color-glass-light)] 
                                         border border-[var(--border-color)]"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium text-[var(--text-primary)] truncate">
                                  {sc.chunk.documentName}
                                </span>
                                <span className="text-[10px] text-[var(--color-primary-400)] font-mono shrink-0 ml-2">
                                  {(sc.finalScore * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">
                                Page {sc.chunk.pageNumber} · {sc.chunk.sectionHeading}
                              </p>
                              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed
                                           line-clamp-3">
                                {sc.chunk.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
