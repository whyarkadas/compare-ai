import OpenAI from "openai";
import { MissingKeyError } from "@/lib/providers/errors";

export const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 96;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new MissingKeyError("OPENAI_API_KEY");
  const client = new OpenAI({ apiKey });

  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.slice(i, i + BATCH_SIZE),
    });
    vectors.push(...res.data.map((d) => d.embedding));
  }
  return vectors;
}
