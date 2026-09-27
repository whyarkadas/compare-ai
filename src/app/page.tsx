"use client";

import { useCallback, useMemo, useState } from "react";
import ChatInput from "@/components/ChatInput";
import AnswerColumn from "@/components/AnswerColumn";
import { PROVIDERS, type ChatMessage, type ProviderId } from "@/lib/types";
import { emptyAnswer, type Turn } from "@/lib/chatState";
import { streamChat } from "@/lib/streamChat";

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

export default function Home() {
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
    <div className="flex h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Compare AI
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ask one question, watch Claude, GPT, and Gemini answer at the
              same time.
            </p>
          </div>
          <ChatInput onSubmit={handleSubmit} disabled={isStreaming} />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <AnswerColumn key={provider.id} provider={provider} turns={turns} />
        ))}
      </main>
    </div>
  );
}
