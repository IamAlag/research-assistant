'use client';

/**
 * ChatContainer — Main chat interface combining message list, input, and typing indicator.
 * Handles scrolling, empty state, and suggested questions.
 */

import { useRef, useEffect } from 'react';
import { MessageSquarePlus, Upload, BookOpen, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import SuggestedQuestions from './SuggestedQuestions';
import type { ChatMessage } from '@/types/chat';

interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading: boolean;
  hasDocuments: boolean;
  onSend: (message: string) => void;
  onRegenerate: () => void;
  suggestedQuestions: string[];
}

export default function ChatContainer({
  messages,
  isLoading,
  hasDocuments,
  onSend,
  onRegenerate,
  suggestedQuestions,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState hasDocuments={hasDocuments} onActionClick={onSend} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <ChatMessageComponent
                key={msg.id}
                message={msg}
                onRegenerate={msg.role === 'assistant' ? onRegenerate : undefined}
              />
            ))}

            <AnimatePresence>
              {isLoading && <TypingIndicator />}
            </AnimatePresence>

            {/* Suggested questions */}
            {!isLoading && suggestedQuestions.length > 0 && (
              <div className="pl-10">
                <SuggestedQuestions
                  questions={suggestedQuestions}
                  onSelect={onSend}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        disabled={!hasDocuments}
      />
    </div>
  );
}

/**
 * EmptyState — Beautiful placeholder shown when no messages exist.
 */
function EmptyState({
  hasDocuments,
  onActionClick,
}: {
  hasDocuments: boolean;
  onActionClick: (msg: string) => void;
}) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg"
      >
        {/* Animated icon */}
        <motion.div
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br 
                     from-[var(--color-primary-500)]/20 to-[var(--color-primary-700)]/20
                     border border-[var(--color-primary-500)]/20 flex items-center justify-center"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(99, 102, 241, 0)',
              '0 0 40px 8px rgba(99, 102, 241, 0.15)',
              '0 0 0 0 rgba(99, 102, 241, 0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Brain size={36} className="text-[var(--color-primary-400)]" />
        </motion.div>

        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          AI Research Assistant
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
          Upload your documents and ask questions. I&apos;ll analyze multiple sources,
          reason through complex queries, and provide cited answers.
        </p>

        {/* Quick Actions Panel when documents are loaded */}
        {hasDocuments ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-[var(--color-primary-400)] tracking-wider uppercase mb-1">
              ⚡ Quick Research Actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                {
                  title: '📋 Generate Research Report',
                  prompt: 'Generate a structured research report detailing the executive summary, methodology, limitations, and future directions for the uploaded papers.',
                  desc: 'Full comparative review paper summary',
                },
                {
                  title: '⚔️ Compare Methodologies',
                  prompt: 'Compare the algorithms, experimental setups, and datasets across all uploaded papers. Draw a side-by-side comparison table.',
                  desc: 'Contrast results and approaches',
                },
                {
                  title: '🧠 Create Study Quiz',
                  prompt: 'Generate an active recall study sheet with multiple choice and conceptual questions based on the uploaded papers.',
                  desc: 'Prep for exams and test knowledge',
                },
                {
                  title: '📌 Extract Key Insights',
                  prompt: 'Extract the core innovations, main findings, and key takeaways from all uploaded papers as bullet points.',
                  desc: 'Quick scan-friendly findings',
                },
              ].map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onActionClick(action.prompt)}
                  className="p-3.5 rounded-xl bg-[var(--color-glass-light)] hover:bg-[var(--color-primary-500)]/15 
                             border border-[var(--border-color)] hover:border-[var(--color-primary-500)]/30 
                             transition-all duration-300 cursor-pointer flex flex-col text-left group"
                >
                  <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary-400)] transition-colors">
                    {action.title}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                    {action.desc}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Feature cards when no docs uploaded */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {[
              {
                icon: <Upload size={16} />,
                title: 'Multi-Format Upload',
                desc: 'PDF, TXT, Markdown',
              },
              {
                icon: <BookOpen size={16} />,
                title: 'Cross-Document',
                desc: 'Analyze relationships',
              },
              {
                icon: <Sparkles size={16} />,
                title: 'Agentic Reasoning',
                desc: 'Multi-step analysis',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-3 rounded-xl bg-[var(--color-glass-light)] border border-[var(--border-color)]"
              >
                <div className="text-[var(--color-primary-400)] mb-2">{feature.icon}</div>
                <p className="text-xs font-medium text-[var(--text-primary)]">{feature.title}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        )}

        {!hasDocuments && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-[var(--color-primary-400)] mt-6 flex items-center justify-center gap-1.5"
          >
            <Upload size={12} />
            Upload documents from the sidebar to get started
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
