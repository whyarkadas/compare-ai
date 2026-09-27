import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/lib/types";
import { MissingKeyError } from "./errors";

// Update this default any time Anthropic ships a newer model you'd rather use.
// See https://docs.claude.com/en/docs/about-claude/models for current model IDs.
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export async function* streamClaude(
  messages: ChatMessage[],
  systemPrompt?: string
): AsyncGenerator<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingKeyError("ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
