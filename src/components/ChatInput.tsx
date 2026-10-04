"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import type { ProviderConfig, ProviderId } from "@/lib/types";
import { formatList } from "@/lib/format";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled: boolean;
  providers: ProviderConfig[];
  recipients: ProviderConfig[];
  onToggleRecipient: (id: ProviderId) => void;
  onSelectAll: () => void;
}

export default function ChatInput({
  onSubmit,
  disabled,
  providers,
  recipients,
  onToggleRecipient,
  onSelectAll,
}: ChatInputProps) {
  const allSelected = recipients.length === providers.length;
  const placeholder =
    providers.length === 1
      ? `Ask ${providers[0].label} anything…`
      : allSelected
        ? `Ask ${providers.length === 2 ? "both" : "all three"} models anything…`
        : `Ask ${recipients.length === 1 ? "only " : ""}${formatList(recipients.map((p) => p.label))}…`;
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="group relative flex w-full flex-col gap-1 rounded-3xl border border-zinc-200/80 bg-white/80 p-2 pl-4 shadow-lg shadow-zinc-900/5 backdrop-blur-xl transition focus-within:border-zinc-300 focus-within:shadow-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-black/40 dark:focus-within:border-white/20"
    >
      {providers.length > 1 && (
        <div
          role="group"
          aria-label="Send to"
          className="-ml-2 flex flex-wrap items-center gap-1 pt-0.5"
        >
          <button
            type="button"
            aria-pressed={allSelected}
            onClick={() => {
              onSelectAll();
              textareaRef.current?.focus();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
              allSelected
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            }`}
          >
            {providers.length === 2 ? "Both" : "All"}
          </button>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-white/10" />
          {providers.map((p) => {
            const selected = recipients.includes(p);
            const locked = selected && recipients.length === 1;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={selected}
                aria-disabled={locked}
                title={locked ? "At least one model must receive the message" : undefined}
                onClick={() => {
                  onToggleRecipient(p.id);
                  textareaRef.current?.focus();
                }}
                style={
                  selected
                    ? { backgroundColor: `${p.color}1f`, borderColor: `${p.color}66` }
                    : undefined
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  selected
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "border-transparent text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                } ${locked ? "cursor-default" : ""}`}
              >
                <span
                  className="flex h-3 w-3 items-center justify-center rounded-full border"
                  style={{
                    borderColor: p.color,
                    backgroundColor: selected ? p.color : "transparent",
                  }}
                >
                  {selected && (
                    <svg viewBox="0 0 12 12" className="h-2 w-2 text-white" aria-hidden>
                      <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          autoFocus
          aria-label="Your question"
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={disabled ? "Waiting for answers" : "Send"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:scale-105 hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:hover:scale-100 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          {disabled ? (
            <span className="h-3 w-3 rounded-[3px] bg-current" />
          ) : (
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
              <path
                d="M10 16V4m0 0-5 5m5-5 5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
