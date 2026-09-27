import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "@/lib/types";
import { MissingKeyError } from "./errors";

// Update this default any time Google ships a newer model you'd rather use.
// See https://ai.google.dev/gemini-api/docs/models for current model IDs.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export const geminiModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;

export async function* streamGemini(
  messages: ChatMessage[],
  systemPrompt?: string
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingKeyError("GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel(),
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
