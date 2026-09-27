"use client";

import { useCallback, useMemo, useState } from "react";
import ChatInput from "@/components/ChatInput";
import AnswerColumn from "@/components/AnswerColumn";
import {
  PROVIDERS,
  type ChatMessage,
  type ProviderId,
} from "@/lib/types";
import { formatList } from "@/lib/format";
import { emptyAnswer, type ColumnAnswer, type Turn } from "@/lib/chatState";
import { streamChat } from "@/lib/streamChat";

const SUGGESTIONS = [
  "Explain quantum entanglement to a 10-year-old",
  "Write a haiku about debugging at 3am",
  "What's the fastest way to learn TypeScript?",
  "Pros and cons of remote work, in a table",
];

// Full class strings so Tailwind can detect them.
const GRID_LAYOUT: Record<number, string> = {
  1: "max-w-4xl md:grid-cols-1",
  2: "max-w-6xl md:grid-cols-2",
  3: "max-w-7xl md:grid-cols-3",
};

function buildHistory(
  providerId: ProviderId,
  priorTurns: Turn[],
  newUserMessage: string
): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (const turn of priorTurns) {
    const answer = turn.answers[providerId];
    // Skip turns this model wasn't asked or failed on; empty assistant turns are rejected by the APIs.
    if (!answer || answer.status === "error" || !answer.content) continue;
    history.push({ role: "user", content: turn.userMessage });
    history.push({ role: "assistant", content: answer.content });
  }
  history.push({ role: "user", content: newUserMessage });
  return history;
}

export default function CompareApp({
  models,
}: {
  models: Record<ProviderId, string>;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeIds, setActiveIds] = useState<ProviderId[]>(
    PROVIDERS.map((p) => p.id)
  );
  // Models on the page that are toggled off as recipients; newly added models default to on.
  const [excludedIds, setExcludedIds] = useState<ProviderId[]>([]);
  const active = useMemo(
    () => PROVIDERS.filter((p) => activeIds.includes(p.id)),
    [activeIds]
  );
  const recipients = useMemo(
    () => active.filter((p) => !excludedIds.includes(p.id)),
    [active, excludedIds]
  );

  const removeModel = (id: ProviderId) => {
    if (activeIds.length === 1) return;
    const remaining = activeIds.filter((x) => x !== id);
    setActiveIds(remaining);
    if (remaining.every((x) => excludedIds.includes(x))) setExcludedIds([]);
  };
  const toggleRecipient = (id: ProviderId) => {
    if (excludedIds.includes(id)) {
      setExcludedIds((ids) => ids.filter((x) => x !== id));
    } else if (recipients.length > 1) {
      setExcludedIds((ids) => [...ids, id]);
    }
  };
  const addModel = (id: ProviderId) =>
    setActiveIds((ids) => (ids.includes(id) ? ids : [...ids, id]));

  const isStreaming = useMemo(
    () =>
      turns.length > 0 &&
      PROVIDERS.some(
        (p) => turns[turns.length - 1].answers[p.id]?.status === "streaming"
      ),
    [turns]
  );

  const updateAnswer = useCallback(
    (
      turnId: string,
      providerId: ProviderId,
      update: (prev: ColumnAnswer) => ColumnAnswer
    ) => {
      setTurns((prev) =>
        prev.map((t) => {
          const answer = t.answers[providerId];
          return t.id === turnId && answer
            ? { ...t, answers: { ...t.answers, [providerId]: update(answer) } }
            : t;
        })
      );
    },
    []
  );

  const handleSubmit = useCallback(
    (message: string) => {
      const turnId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const priorTurns = turns;

      const newTurn: Turn = {
        id: turnId,
        userMessage: message,
        answers: Object.fromEntries(
          recipients.map((p) => [p.id, emptyAnswer()])
        ),
      };

      setTurns((prev) => [...prev, newTurn]);

      for (const provider of recipients) {
        const history = buildHistory(provider.id, priorTurns, message);
        streamChat(provider.id, history, {
          onDelta: (text) =>
            updateAnswer(turnId, provider.id, (prev) => ({
              ...prev,
              content: prev.content + text,
            })),
          onError: (msg, code) =>
            updateAnswer(turnId, provider.id, (prev) => ({
              ...prev,
              status: "error",
              errorMessage: msg,
              errorCode: code,
            })),
          onDone: () =>
            updateAnswer(turnId, provider.id, (prev) =>
              prev.status === "error" ? prev : { ...prev, status: "done" }
            ),
        });
      }
    },
    [turns, recipients, updateAnswer]
  );

  return (
    <div className="app-backdrop flex h-dvh flex-col">
      <header className="shrink-0 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 shadow-sm dark:bg-white">
            <div className="flex gap-0.5">
              {PROVIDERS.map((p) => (
                <span
                  key={p.id}
                  className="h-3.5 w-1.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
              ))}
            </div>
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Compare AI
            </h1>
            <p className="hidden text-xs text-zinc-500 sm:block dark:text-zinc-400">
              One prompt · up to three models · side by side
            </p>
          </div>
          <div
            role="group"
            aria-label="Models on the page"
            className="order-last flex w-full flex-wrap items-center gap-1.5 sm:order-none sm:ml-auto sm:w-auto"
          >
            {PROVIDERS.map((p) => {
              const on = activeIds.includes(p.id);
              const isLast = on && activeIds.length === 1;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => (on ? removeModel(p.id) : addModel(p.id))}
                  disabled={isLast}
                  aria-pressed={on}
                  title={
                    isLast
                      ? "At least one model must stay on the page"
                      : on
                        ? `Remove ${p.label}`
                        : `Add ${p.label}`
                  }
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur transition disabled:cursor-not-allowed ${
                    on
                      ? "border border-zinc-200 bg-white/80 text-zinc-800 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-zinc-100 dark:hover:bg-white/15"
                      : "border border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 dark:border-white/15 dark:text-zinc-400 dark:hover:border-white/30 dark:hover:text-zinc-100"
                  }`}
                >
                  {on ? (
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  ) : (
                    <span aria-hidden>+</span>
                  )}
                  {p.label}
                  {on && !isLast && (
                    <span aria-hidden className="-mr-1 text-zinc-400">
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => setTurns([])}
              className="ml-auto sm:ml-0 inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-zinc-700 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New chat
            </button>
          )}
        </div>
      </header>

      {turns.length === 0 ? (
        <main className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
          <div className="fade-up flex max-w-2xl flex-col items-center">
            <div className="mb-6 flex -space-x-2">
              {active.map((p) => (
                <span
                  key={p.id}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-semibold text-white shadow-lg ring-4 ring-[var(--background)]"
                  style={{ backgroundColor: p.color }}
                >
                  {p.label[0]}
                </span>
              ))}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Which model answers best?
            </h2>
            <p className="mt-3 text-[15px] text-zinc-500 dark:text-zinc-400">
              {active.length === 1
                ? `Chat with ${active[0].label}, or add more models above to compare answers side by side.`
                : `Ask once. ${formatList(active.map((p) => p.label))} stream their answers in parallel so you can compare them live.`}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSubmit(s)}
                  className="rounded-full border border-zinc-200 bg-white/70 px-4 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : (
        <main
          className={`mx-auto grid min-h-0 w-full flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 pt-4 sm:px-6 md:overflow-hidden ${GRID_LAYOUT[active.length]}`}
        >
          {active.map((provider) => (
            <AnswerColumn
              key={provider.id}
              provider={provider}
              model={models[provider.id]}
              turns={turns}
              dimmed={!recipients.includes(provider)}
              onRemove={
                active.length > 1 ? () => removeModel(provider.id) : undefined
              }
            />
          ))}
        </main>
      )}

      <footer className="shrink-0 px-4 pb-4 pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSubmit={handleSubmit}
            disabled={isStreaming}
            providers={active}
            recipients={recipients}
            onToggleRecipient={toggleRecipient}
            onSelectAll={() => setExcludedIds([])}
          />
          <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </footer>
    </div>
  );
}
