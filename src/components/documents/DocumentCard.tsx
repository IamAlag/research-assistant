'use client';

/**
 * DocumentCard — Individual document display in the sidebar.
 * Shows metadata, stats, and a delete button.
 */

import { FileText, Trash2, File, FileCode } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DocumentMetadata } from '@/types/document';

interface DocumentCardProps {
  document: DocumentMetadata;
  onDelete: (id: string) => void;
}

const fileIcons: Record<string, React.ReactNode> = {
  pdf: <FileText size={16} className="text-red-400" />,
  txt: <File size={16} className="text-blue-400" />,
  md: <FileCode size={16} className="text-green-400" />,
};

export default function DocumentCard({ document: doc, onDelete }: DocumentCardProps) {
  const sizeKB = (doc.fileSize / 1024).toFixed(0);
  const sizeDisplay = doc.fileSize > 1024 * 1024
    ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`
    : `${sizeKB} KB`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      className="group relative p-3 rounded-lg bg-[var(--color-glass-light)] 
                 border border-[var(--border-color)] hover:border-[var(--color-primary-500)]/30
                 transition-all duration-200 cursor-default"
      id={`doc-card-${doc.id}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {fileIcons[doc.fileType] || <FileText size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
            {doc.title}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">
            {doc.fileName}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-glass-light)] text-[var(--text-tertiary)]">
              {doc.pageCount} pg{doc.pageCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-glass-light)] text-[var(--text-tertiary)]">
              {doc.chunkCount} chunks
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-glass-light)] text-[var(--text-tertiary)]">
              {sizeDisplay}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <motion.button
          onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md
                     hover:bg-[var(--color-error-500)]/20 text-[var(--text-tertiary)]
                     hover:text-[var(--color-error-400)] transition-all shrink-0"
          whileTap={{ scale: 0.85 }}
          aria-label={`Delete ${doc.fileName}`}
        >
          <Trash2 size={12} />
        </motion.button>
      </div>
    </motion.div>
  );
}
