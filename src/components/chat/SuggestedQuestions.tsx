'use client';

/**
 * SuggestedQuestions — Clickable follow-up question chips.
 */

import { Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-1.5">
        <Lightbulb size={12} className="text-[var(--color-accent-400)]" />
        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          Suggested follow-ups
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <motion.button
            key={i}
            onClick={() => onSelect(q)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)]
                       bg-[var(--color-glass-light)] text-[var(--text-secondary)]
                       hover:text-[var(--text-primary)] hover:border-[var(--color-primary-500)]/40
                       hover:bg-[var(--color-primary-500)]/10 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {q}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
