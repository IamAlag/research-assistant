'use client';

/**
 * CitationCard — Expandable source citation display.
 * Shows document name, page, section, quoted text, and relevance score.
 */

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Citation } from '@/types/chat';

interface CitationCardProps {
  citation: Citation;
  index: number;
}

export default function CitationCard({ citation, index }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scorePercent = (citation.relevanceScore * 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-[var(--border-color)] bg-[var(--color-glass-light)]
                 overflow-hidden transition-colors hover:border-[var(--color-primary-500)]/30"
      id={`citation-${index}`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-2.5 text-left"
      >
        <div className="w-5 h-5 rounded bg-[var(--color-primary-500)]/15 
                        flex items-center justify-center shrink-0">
          <FileText size={10} className="text-[var(--color-primary-400)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">
            {citation.documentName}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Page {citation.pageNumber} · {citation.sectionHeading}
          </p>
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
          Number(scorePercent) >= 70
            ? 'bg-[var(--color-success-500)]/15 text-[var(--color-success-400)]'
            : Number(scorePercent) >= 40
            ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-400)]'
            : 'bg-[var(--color-error-500)]/15 text-[var(--color-error-400)]'
        }`}>
          {scorePercent}%
        </span>
        {isExpanded ? (
          <ChevronUp size={12} className="text-[var(--text-tertiary)] shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-[var(--text-tertiary)] shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 pt-0">
              <div className="p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-color)]
                              text-[11px] text-[var(--text-secondary)] leading-relaxed
                              max-h-32 overflow-y-auto italic">
                &ldquo;{citation.quotation}&rdquo;
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
