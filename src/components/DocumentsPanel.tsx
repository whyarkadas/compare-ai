"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentInfo } from "@/lib/types";
import { deleteDocument, uploadDocument } from "@/lib/documentsClient";

interface DocumentsPanelProps {
  documents: DocumentInfo[];
  onDocumentsChange: (update: (docs: DocumentInfo[]) => DocumentInfo[]) => void;
  useDocs: boolean;
  onUseDocsChange: (value: boolean) => void;
}

interface UploadState {
  key: string;
  name: string;
  error?: string;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPanel({
  documents,
  onDocumentsChange,
  useDocs,
  onUseDocsChange,
}: DocumentsPanelProps) {
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const queued = Array.from(files).map((file) => ({
      file,
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
    }));
    setUploads((prev) => [...prev, ...queued.map(({ file, key }) => ({ key, name: file.name }))]);

    for (const { file, key } of queued) {
      try {
        const doc = await uploadDocument(file);
        onDocumentsChange((docs) => [...docs, doc]);
        setUploads((prev) => prev.filter((u) => u.key !== key));
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.key === key ? { ...u, error: (err as Error).message } : u
          )
        );
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    try {
      await deleteDocument(id);
      onDocumentsChange((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  const uploading = uploads.some((u) => !u.error);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-zinc-700 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M6 2.75h5.5L15.25 6.5v10.75H6a1.25 1.25 0 0 1-1.25-1.25V4A1.25 1.25 0 0 1 6 2.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11.25 2.75V6.75h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Documents
        {documents.length > 0 && (
          <span
            className={`rounded-full px-1.5 text-[10px] font-semibold ${
              useDocs
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-200 text-zinc-600 dark:bg-white/15 dark:text-zinc-300"
            }`}
          >
            {documents.length}
          </span>
        )}
        {uploading && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" aria-label="Uploading" />
        )}
      </button>

      {open && (
        <div className="fade-up absolute right-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white/95 p-3 text-left shadow-xl shadow-zinc-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-black/50">
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Documents
            </h3>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              Use in answers
              <button
                type="button"
                role="switch"
                aria-checked={useDocs}
                onClick={() => onUseDocsChange(!useDocs)}
                className={`relative h-5 w-9 rounded-full transition ${
                  useDocs ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    useDocs ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
          <p className="mt-1 px-1 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
            Relevant passages from these PDFs are added to every model&rsquo;s
            prompt, so all models answer from the same sources.
          </p>

          <ul className="thin-scroll mt-3 max-h-64 space-y-1 overflow-y-auto">
            {documents.length === 0 && uploads.length === 0 && (
              <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400 dark:border-white/10 dark:text-zinc-500">
                No documents yet.
              </li>
            )}
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-white/5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-[9px] font-bold text-red-600 dark:text-red-400">
                  PDF
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100" title={doc.name}>
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {doc.pages} pages · {doc.chunks} chunks · {formatSize(doc.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  aria-label={`Delete ${doc.name}`}
                  title="Delete"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 opacity-60 transition hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
            {uploads.map((u) => (
              <li key={u.key} className="flex items-start gap-2 rounded-xl px-2 py-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/5">
                  {u.error ? (
                    <span className="text-xs font-bold text-red-500">!</span>
                  ) : (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200" />
                  )}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-100">{u.name}</p>
                  <p className={`text-[10px] ${u.error ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                    {u.error ?? "Reading and indexing…"}
                  </p>
                </div>
                {u.error && (
                  <button
                    type="button"
                    onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))}
                    aria-label="Dismiss"
                    className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {deleteError && (
            <p className="mt-2 px-1 text-[11px] text-red-600 dark:text-red-400">{deleteError}</p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
              <path d="M10 13V3m0 0L6 7m4-4 4 4M4 13v2.25A1.75 1.75 0 0 0 5.75 17h8.5A1.75 1.75 0 0 0 16 15.25V13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Upload PDF
          </button>
        </div>
      )}
    </div>
  );
}
