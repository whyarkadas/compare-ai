import type { ChatMessage, ProviderId, StreamFrame } from "@/lib/types";
import { streamClaude } from "@/lib/providers/anthropic";
import { streamOpenAI } from "@/lib/providers/openai";
import { streamGemini } from "@/lib/providers/gemini";
import { MissingKeyError } from "@/lib/providers/errors";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are a helpful, concise assistant. Answer the user's question directly.";

function getGenerator(provider: ProviderId, messages: ChatMessage[]) {
  switch (provider) {
    case "claude":
      return streamClaude(messages, SYSTEM_PROMPT);
    case "openai":
      return streamOpenAI(messages, SYSTEM_PROMPT);
    case "gemini":
      return streamGemini(messages, SYSTEM_PROMPT);
  }
}

function isProviderId(value: string): value is ProviderId {
  return value === "claude" || value === "openai" || value === "gemini";
}

export async function POST(
  req: Request,
  context: RouteContext<"/api/chat/[provider]">
) {
  const { provider: providerParam } = await context.params;

  if (!isProviderId(providerParam)) {
    return new Response("Unknown provider", { status: 400 });
  }
  const provider = providerParam;

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages must be a non-empty array");
    }
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const encoder = new TextEncoder();

  const write = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    frame: StreamFrame
  ) => {
    controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const generator = getGenerator(provider, messages);
        for await (const chunk of generator) {
          write(controller, { type: "delta", text: chunk });
        }
        write(controller, { type: "done" });
      } catch (err) {
        if (err instanceof MissingKeyError) {
          write(controller, {
            type: "error",
            message: `${err.envKey} is not set. Add it to your environment to enable ${provider}.`,
            code: "missing_key",
          });
        } else {
          const message =
            err instanceof Error ? err.message : "Unknown provider error";
          write(controller, { type: "error", message, code: "provider_error" });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
