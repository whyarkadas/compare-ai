import type { ChatMessage, ProviderId, Source, StreamFrame } from "@/lib/types";
import { streamClaude } from "@/lib/providers/anthropic";
import { streamOpenAI } from "@/lib/providers/openai";
import { streamGemini } from "@/lib/providers/gemini";
import { MissingKeyError } from "@/lib/providers/errors";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are a helpful, concise assistant. Answer the user's question directly.";

function buildSystemPrompt(sources: Source[]) {
  if (sources.length === 0) return SYSTEM_PROMPT;
  const listed = sources
    .map((s, i) => `[${i + 1}] ${s.document}, page ${s.page}\n${s.text}`)
    .join("\n\n");
  return `${SYSTEM_PROMPT}

The user has uploaded documents. Passages that may be relevant to their question are listed below. When they are relevant, base your answer on them and cite them inline like [1] or [2]. If they don't contain the answer, say so briefly, then answer from general knowledge and make clear which parts aren't from the documents.

<sources>
${listed}
</sources>`;
}

function parseSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (s): s is Source =>
        typeof s?.document === "string" &&
        typeof s?.page === "number" &&
        typeof s?.text === "string"
    )
    .slice(0, 10);
}

function getGenerator(
  provider: ProviderId,
  messages: ChatMessage[],
  systemPrompt: string
) {
  switch (provider) {
    case "claude":
      return streamClaude(messages, systemPrompt);
    case "openai":
      return streamOpenAI(messages, systemPrompt);
    case "gemini":
      return streamGemini(messages, systemPrompt);
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
  let systemPrompt: string;
  try {
    const body = await req.json();
    messages = body.messages;
    systemPrompt = buildSystemPrompt(parseSources(body.sources));
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
        const generator = getGenerator(provider, messages, systemPrompt);
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
