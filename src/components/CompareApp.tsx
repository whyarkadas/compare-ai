"use client";

import { useCallback, useMemo, useState } from "react";
import ChatInput from "@/components/ChatInput";
import AnswerColumn from "@/components/AnswerColumn";
import { PROVIDERS, type ChatMessage, type ProviderId } from "@/lib/types";
import { emptyAnswer, type Turn } from "@/lib/chatState";
import { streamChat } from "@/lib/streamChat";

const SUGGESTIONS = [
  "Explain quantum entanglement to a 10-year-old",
  "Write a haiku about debugging at 3am",
  "What's the fastest way to learn TypeScript?",
  "Pros and cons of remote work, in a table",
];

function buildHistory(
  providerId: ProviderId,
  priorTurns: Turn[],
  newUserMessage: string
): ChatMessage[] {
  const history: ChatMessage[] = [];
  for (const turn of priorTurns) {
    history.push({ role: "user", content: turn.userMessage });
    history.push({
      role: "assistant",
      content: turn.answers[providerId]?.content ?? "",
    });
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
      update: (prev: Turn["answers"][ProviderId]) => Turn["answers"][ProviderId]
    ) => {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                answers: {
                  ...t.answers,
                  [providerId]: update(t.answers[providerId]),
                },
              }
            : t
        )
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
        answers: {
          claude: emptyAnswer(),
          openai: emptyAnswer(),
          gemini: emptyAnswer(),
        },
      };

      setTurns((prev) => [...prev, newTurn]);

      for (const provider of PROVIDERS) {
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
    [turns, updateAnswer]
  );

  return (
    <div className="app-backdrop flex h-dvh flex-col">
      <header className="shrink-0 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
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
              One prompt · three models · side by side
            </p>
          </div>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => setTurns([])}
              className="ml-auto inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-zinc-700 backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
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
              {PROVIDERS.map((p) => (
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
              Ask once. Claude, GPT, and Gemini stream their answers in
              parallel so you can compare them live.
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
        <main className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 pt-4 sm:px-6 md:grid-cols-3 md:overflow-hidden">
          {PROVIDERS.map((provider) => (
            <AnswerColumn
              key={provider.id}
              provider={provider}
              model={models[provider.id]}
              turns={turns}
            />
          ))}
        </main>
      )}

      <footer className="shrink-0 px-4 pb-4 pt-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
          <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </footer>
    </div>
  );
}
