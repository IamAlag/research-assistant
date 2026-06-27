'use client';

/**
 * FileUploadZone — Drag-and-drop file upload with progress tracking.
 * 
 * Supports PDF, TXT, and Markdown files.
 * Shows upload progress and processing status per file.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UploadProgress } from '@/types/document';

interface FileUploadZoneProps {
  onUploadComplete: () => void;
  isUploading: boolean;
  setIsUploading: (v: boolean) => void;
}

export default function FileUploadZone({ onUploadComplete, isUploading, setIsUploading }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);

    // Initialize progress tracking
    const progress: UploadProgress[] = files.map(f => ({
      fileName: f.name,
      stage: 'uploading',
      progress: 0,
    }));
    setUploadProgress(progress);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      // Update progress to show uploading
      setUploadProgress(prev => prev.map(p => ({ ...p, stage: 'extracting', progress: 30 })));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Update progress based on results
      setUploadProgress(
        data.results.map((result: { success: boolean; error?: string; document?: { fileName: string } }, index: number) => ({
          fileName: files[index]?.name || 'Unknown',
          stage: result.success ? 'complete' : 'error',
          progress: result.success ? 100 : 0,
          error: result.error,
        }))
      );

      onUploadComplete();

      // Clear progress after delay
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    } catch (error) {
      setUploadProgress(prev =>
        prev.map(p => ({
          ...p,
          stage: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md"
        onChange={handleFileSelect}
        className="hidden"
        id="file-input"
      />
      {/* Drop zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-6
          transition-all duration-300 text-center
          ${isDragOver
            ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-500)]/10 scale-[1.02]'
            : 'border-[var(--border-color)] hover:border-[var(--color-primary-500)]/40 hover:bg-[var(--color-glass-light)]'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
        whileHover={!isUploading ? { y: -2 } : {}}
        id="file-upload-zone"
      >

        <div className="flex flex-col items-center gap-2">
          <motion.div
            animate={isDragOver ? { scale: 1.2, y: -4 } : { scale: 1, y: 0 }}
            className="w-10 h-10 rounded-xl bg-[var(--color-primary-500)]/15 
                       flex items-center justify-center"
          >
            <Upload size={20} className="text-[var(--color-primary-400)]" />
          </motion.div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {isDragOver ? 'Drop files here' : 'Drop files or click to upload'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              PDF, TXT, Markdown — up to 20MB each
            </p>
          </div>
        </div>
      </motion.div>

      {/* Upload progress */}
      <AnimatePresence>
        {uploadProgress.map((prog, idx) => (
          <motion.div
            key={`${prog.fileName}-${idx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-[var(--color-glass-light)] p-3 border border-[var(--border-color)]"
          >
            <div className="flex items-center gap-2">
              {prog.stage === 'complete' ? (
                <CheckCircle2 size={14} className="text-[var(--color-success-400)] shrink-0" />
              ) : prog.stage === 'error' ? (
                <AlertCircle size={14} className="text-[var(--color-error-400)] shrink-0" />
              ) : (
                <Loader2 size={14} className="text-[var(--color-primary-400)] animate-spin shrink-0" />
              )}
              <span className="text-xs text-[var(--text-primary)] truncate flex-1">
                {prog.fileName}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] capitalize shrink-0">
                {prog.stage === 'complete' ? '✓ Ready' : prog.stage === 'error' ? 'Failed' : prog.stage}
              </span>
            </div>
            {prog.error && (
              <p className="text-[10px] text-[var(--color-error-400)] mt-1 pl-5">{prog.error}</p>
            )}
            {prog.stage !== 'complete' && prog.stage !== 'error' && (
              <div className="mt-2 h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-400)] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${prog.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
