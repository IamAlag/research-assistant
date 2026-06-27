'use client';

/**
 * Header — App top bar with branding, controls, and status indicators.
 */

import { Brain, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  documentCount: number;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function Header({ documentCount, onToggleSidebar, sidebarOpen }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[var(--border-color)]
                        bg-[var(--bg-secondary)] z-50 relative">
      {/* Left — Logo and brand */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onToggleSidebar}
          className="flex items-center gap-2 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="sidebar-toggle"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] 
                          to-[var(--color-primary-700)] flex items-center justify-center
                          shadow-lg shadow-[var(--color-primary-500)]/20">
            <Brain size={18} className="text-white" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Research Assistant
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] leading-none">
              AI-Powered Document Analysis
            </span>
          </div>
        </motion.button>
      </div>

      {/* Center — Status */}
      <div className="hidden md:flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Sparkles size={12} className="text-[var(--color-primary-400)]" />
        <span>
          {documentCount > 0 
            ? `${documentCount} document${documentCount !== 1 ? 's' : ''} loaded`
            : 'Upload documents to begin'}
        </span>
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
