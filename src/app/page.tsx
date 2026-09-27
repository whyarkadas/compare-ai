import CompareApp from "@/components/CompareApp";
import { claudeModel } from "@/lib/providers/anthropic";
import { openAIModel } from "@/lib/providers/openai";
import { geminiModel } from "@/lib/providers/gemini";

export default function Page() {
  return (
    <CompareApp
      models={{ claude: claudeModel(), openai: openAIModel(), gemini: geminiModel() }}
    />
  );
}
