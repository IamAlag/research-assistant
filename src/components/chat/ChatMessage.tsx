'use client';

/**
 * ChatMessage — Individual message bubble for user and assistant messages.
 * 
 * User messages: Simple right-aligned bubble
 * Assistant messages: Left-aligned with markdown, citations, and copy/regenerate buttons
 */

import { useState } from 'react';
import { User, Brain, Copy, Check, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import MarkdownRenderer from './MarkdownRenderer';
import CitationCard from './CitationCard';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
}

export default function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      id={`message-${message.id}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
        isUser
          ? 'bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)]'
          : 'bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)]'
      }`}>
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Brain size={14} className="text-white" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white'
            : 'bg-[var(--color-glass-light)] border border-[var(--border-color)]'
        }`}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Assistant message extras */}
        {!isUser && (
          <div className="mt-2 space-y-2">
            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Sources ({message.citations.length})
                </p>
                <div className="grid gap-1.5">
                  {message.citations.map((citation, i) => (
                    <CitationCard key={citation.chunkId} citation={citation} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1 pt-1">
              <motion.button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]
                           text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                           hover:bg-[var(--color-glass-light)] transition-colors"
                whileTap={{ scale: 0.95 }}
                id="copy-answer"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy'}
              </motion.button>
              {onRegenerate && (
                <motion.button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]
                             text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                             hover:bg-[var(--color-glass-light)] transition-colors"
                  whileTap={{ scale: 0.95 }}
                  id="regenerate-answer"
                >
                  <RotateCcw size={10} />
                  Regenerate
                </motion.button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
