'use client';

/**
 * ChatInput — Rich input with send button and keyboard shortcut support.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t border-[var(--border-color)]">
      <div className="max-w-3xl mx-auto relative">
        <div className="flex items-end gap-2 p-2 rounded-xl bg-[var(--color-glass-light)] 
                        border border-[var(--border-color)] focus-within:border-[var(--border-active)]
                        transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Upload documents to start asking questions...' : 'Ask a question about your documents...'}
            disabled={isLoading || disabled}
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] 
                       placeholder:text-[var(--text-tertiary)] resize-none outline-none
                       px-2 py-1.5 max-h-40 disabled:opacity-50"
            id="chat-input"
          />
          <motion.button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || disabled}
            className="p-2 rounded-lg bg-[var(--color-primary-500)] text-white
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-[var(--color-primary-600)] transition-colors shrink-0"
            whileTap={{ scale: 0.9 }}
            id="send-button"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
