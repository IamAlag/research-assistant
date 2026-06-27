'use client';

/**
 * ThemeToggle — Dark/Light mode switcher.
 * 
 * Persists preference to localStorage and applies via data-theme attribute.
 * Uses a smooth icon transition animation.
 */

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === 'dark' : prefersDark;
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light');
  };

  return (
    <motion.button
      onClick={toggle}
      className="relative p-2 rounded-xl transition-colors duration-200
                 hover:bg-[var(--color-glass-light)] text-[var(--text-secondary)]
                 hover:text-[var(--text-primary)]"
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle theme"
      id="theme-toggle"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon size={18} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? -180 : 0, scale: isDark ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center"
      >
        <Sun size={18} />
      </motion.div>
    </motion.button>
  );
}
