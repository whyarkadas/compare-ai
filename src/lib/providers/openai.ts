import OpenAI from "openai";
import type { ChatMessage } from "@/lib/types";
import { MissingKeyError } from "./errors";

// Update this default any time OpenAI ships a newer model you'd rather use.
// See https://platform.openai.com/docs/models for current model IDs.
const DEFAULT_MODEL = "gpt-6-luna";

export const openAIModel = () => process.env.OPENAI_MODEL || DEFAULT_MODEL;

export async function* streamOpenAI(
  messages: ChatMessage[],
  systemPrompt?: string
): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new MissingKeyError("OPENAI_API_KEY");

  const client = new OpenAI({ apiKey });

  const stream = await client.chat.completions.create({
    model: openAIModel(),
    messages: [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
