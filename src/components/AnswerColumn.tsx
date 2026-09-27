"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ProviderConfig } from "@/lib/types";
import type { ColumnAnswer, Turn } from "@/lib/chatState";

interface AnswerColumnProps {
  provider: ProviderConfig;
  model: string;
  turns: Turn[];
  dimmed: boolean;
  onRemove?: () => void;
}

function StatusPill({ answer }: { answer?: ColumnAnswer }) {
  if (!answer) return null;
  const { label, dot } =
    answer.status === "error"
      ? { label: "Error", dot: "bg-red-500" }
      : answer.status === "done"
        ? { label: "Done", dot: "bg-emerald-500" }
        : { label: answer.content ? "Writing" : "Thinking", dot: "bg-amber-400 animate-pulse" };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="Thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

export default function AnswerColumn({
  provider,
  model,
  turns,
  dimmed,
  onRemove,
}: AnswerColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const myTurns = turns.flatMap((turn) => {
    const answer = turn.answers[provider.id];
    return answer ? [{ turn, answer }] : [];
  });
  const lastAnswer = myTurns.at(-1)?.answer;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <section
      className={`fade-up transition-opacity duration-300 ${dimmed ? "opacity-45" : ""} flex min-h-[18rem] flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/70 shadow-sm shadow-zinc-900/5 backdrop-blur-xl md:min-h-0 dark:border-white/10 dark:bg-zinc-900/60`}
    >
      <header className="relative flex shrink-0 items-center gap-3 px-4 py-3">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-60"
          style={{
            background: `linear-gradient(to bottom, ${provider.color}22, transparent)`,
          }}
        />
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm"
          style={{ backgroundColor: provider.color }}
        >
          {provider.label[0]}
        </span>
        <div className="relative min-w-0 leading-tight">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {provider.label}
            <span className="ml-1.5 text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
              {provider.vendor}
            </span>
          </h2>
          <p
            className="mt-0.5 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400"
            title={model}
          >
            {model}
          </p>
        </div>
        <div className="relative ml-auto flex shrink-0 items-center gap-1">
          <StatusPill answer={lastAnswer} />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${provider.label} from the page`}
              title={`Remove ${provider.label}`}
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-900/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="thin-scroll flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-1"
      >
        {turns.length > 0 && myTurns.length === 0 && (
          <p className="pt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No messages sent to {provider.label} yet.
          </p>
        )}
        {myTurns.map(({ turn, answer }) => {
          return (
            <article key={turn.id} className="fade-up space-y-3">
              <div className="flex justify-end">
                <p className="max-w-[90%] rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2 text-[13px] leading-5 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {turn.userMessage}
                </p>
              </div>

              {answer.status === "error" ? (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <p className="[overflow-wrap:anywhere]">{answer.errorMessage}</p>
                  {answer.errorCode === "missing_key" && (
                    <a
                      href={provider.keyHelpUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30"
                    >
                      Get a {provider.vendor} API key →
                    </a>
                  )}
                </div>
              ) : answer.status === "streaming" && !answer.content ? (
                <TypingDots />
              ) : (
                <div className="[overflow-wrap:anywhere] prose prose-sm prose-zinc max-w-none text-[14px] leading-relaxed dark:prose-invert prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-pre:text-[12.5px] prose-code:before:content-none prose-code:after:content-none dark:prose-pre:bg-black/60">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {answer.content}
                  </ReactMarkdown>
                  {answer.status === "streaming" && (
                    <span
                      className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full align-middle"
                      style={{ backgroundColor: provider.color }}
                    />
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
