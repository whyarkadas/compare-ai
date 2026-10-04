import type { ChatMessage, ProviderId, Source, StreamFrame } from "./types";

interface StreamHandlers {
  onDelta: (text: string) => void;
  onError: (message: string, code?: "missing_key" | "provider_error") => void;
  onDone?: () => void;
}

function handleFrame(line: string, handlers: StreamHandlers) {
  if (!line.trim()) return;
  let frame: StreamFrame;
  try {
    frame = JSON.parse(line);
  } catch {
    return;
  }
  if (frame.type === "delta") handlers.onDelta(frame.text);
  else if (frame.type === "error") handlers.onError(frame.message, frame.code);
  else if (frame.type === "done") handlers.onDone?.();
}

/**
 * Streams a chat completion from one provider. The API route returns
 * newline-delimited JSON frames ({type:"delta"|"error"|"done"}), which we
 * parse incrementally as chunks arrive over the network.
 */
export async function streamChat(
  provider: ProviderId,
  messages: ChatMessage[],
  sources: Source[],
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/chat/${provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, sources }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    handlers.onError(
      "Network error while contacting the server.",
      "provider_error"
    );
    return;
  }

  if (!res.ok || !res.body) {
    handlers.onError(`Request failed (HTTP ${res.status}).`, "provider_error");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleFrame(line, handlers);
    }
    if (buffer.trim()) handleFrame(buffer, handlers);
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError(
        "Connection interrupted while streaming the response.",
        "provider_error"
      );
    }
  }
}
