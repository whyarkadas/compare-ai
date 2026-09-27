export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export type ProviderId = "claude" | "openai" | "gemini";
export interface ProviderConfig {
  id: ProviderId;
  label: string;
  vendor: string;
  color: string;
  envKey: string;
  keyHelpUrl: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude",
    vendor: "Anthropic",
    color: "#D97757",
    envKey: "ANTHROPIC_API_KEY",
    keyHelpUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    label: "GPT",
    vendor: "OpenAI",
    color: "#10A37F",
    envKey: "OPENAI_API_KEY",
    keyHelpUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Gemini",
    vendor: "Google",
    color: "#4285F4",
    envKey: "GEMINI_API_KEY",
    keyHelpUrl: "https://aistudio.google.com/apikey",
  },
];

// NDJSON stream frame shapes sent from /api/chat/[provider] to the client.
export type StreamFrame =
  | { type: "delta"; text: string }
  | { type: "error"; message: string; code?: "missing_key" | "provider_error" }
  | { type: "done" };
