"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ProviderConfig } from "@/lib/types";
import type { Turn } from "@/lib/chatState";

interface AnswerColumnProps {
  provider: ProviderConfig;
  turns: Turn[];
}

export default function AnswerColumn({ provider, turns }: AnswerColumnProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-1 shrink-0" style={{ backgroundColor: provider.color }} />
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: provider.color }}
        />
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {provider.label}
        </h2>
        <span className="text-xs text-zinc-400">{provider.vendor}</span>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {turns.length === 0 && (
          <p className="text-sm text-zinc-400">
            {provider.label}&rsquo;s answer will appear here.
          </p>
        )}

        {turns.map((turn) => {
          const answer = turn.answers[provider.id];
          return (
            <div key={turn.id} className="space-y-2">
              <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {turn.userMessage}
              </p>

              {answer.status === "error" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <p>{answer.errorMessage}</p>
                  {answer.errorCode === "missing_key" && (
                    <a
                      href={provider.keyHelpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block underline"
                    >
                      Get a {provider.vendor} API key →
                    </a>
                  )}
                </div>
              ) : (
                <div className="prose prose-sm prose-zinc max-w-none text-sm leading-relaxed text-zinc-800 dark:prose-invert dark:text-zinc-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {answer.content || (answer.status === "streaming" ? "" : "")}
                  </ReactMarkdown>
                  {answer.status === "streaming" && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-zinc-400 align-middle dark:bg-zinc-500" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
