import type { Source } from "@/lib/types";
import { embedTexts } from "./embed";
import { allChunks, listDocuments } from "./store";

const TOP_K = 5;
// Below this cosine similarity a chunk is almost never relevant for text-embedding-3 models.
const MIN_SCORE = 0.25;

function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function searchDocuments(query: string): Promise<Source[]> {
  const chunks = await allChunks();
  if (chunks.length === 0) return [];

  const [queryVector] = await embedTexts([query]);
  const names = new Map((await listDocuments()).map((d) => [d.id, d.name]));

  return chunks
    .map((c) => ({ chunk: c, score: cosine(queryVector, c.embedding) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map(({ chunk, score }) => ({
      documentId: chunk.documentId,
      document: names.get(chunk.documentId) ?? "Unknown document",
      page: chunk.page,
      text: chunk.text,
      score,
    }));
}
