"use client";

import { useState, useRef, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSubmit, disabled }: ChatInputProps) {
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
      className="group relative flex w-full items-end gap-2 rounded-3xl border border-zinc-200/80 bg-white/80 p-2 pl-4 shadow-lg shadow-zinc-900/5 backdrop-blur-xl transition focus-within:border-zinc-300 focus-within:shadow-xl dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-black/40 dark:focus-within:border-white/20"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask all three models anything…"
        rows={1}
        autoFocus
        aria-label="Your question"
        className="max-h-40 flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label={disabled ? "Waiting for answers" : "Send"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:scale-105 hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:hover:scale-100 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
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
    </form>
  );
}
