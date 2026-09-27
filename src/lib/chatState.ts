import type { ProviderId } from "./types";

export type AnswerStatus = "streaming" | "done" | "error";

export interface ColumnAnswer {
  content: string;
  status: AnswerStatus;
  errorMessage?: string;
  errorCode?: "missing_key" | "provider_error";
}

export interface Turn {
  id: string;
  userMessage: string;
  answers: Record<ProviderId, ColumnAnswer>;
}

export function emptyAnswer(): ColumnAnswer {
  return { content: "", status: "streaming" };
}
