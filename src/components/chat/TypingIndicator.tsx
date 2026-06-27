'use client';

/**
 * TypingIndicator — Animated dots shown while the assistant is thinking.
 */

import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5
                      bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)]">
        <Brain size={14} className="text-white" />
      </div>
      <div className="px-4 py-3 rounded-xl bg-[var(--color-glass-light)] border border-[var(--border-color)]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--color-primary-400)]"
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
          <span className="text-xs text-[var(--text-tertiary)] ml-2">Thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}
