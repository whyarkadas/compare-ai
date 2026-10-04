import { randomUUID } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { MissingKeyError } from "@/lib/providers/errors";
import { chunkPage } from "@/lib/rag/chunk";
import { embedTexts } from "@/lib/rag/embed";
import { addDocument, listDocuments, type Chunk } from "@/lib/rag/store";
import type { DocumentInfo } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

export async function GET() {
  return Response.json({ documents: await listDocuments() });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "Only PDF files are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "PDF is larger than 20 MB." }, { status: 413 });
  }

  let pages: string[];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    pages = (await extractText(pdf, { mergePages: false })).text;
  } catch {
    return Response.json({ error: "Couldn't read this PDF." }, { status: 422 });
  }

  const pieces = pages.flatMap((text, i) =>
    chunkPage(text).map((chunk) => ({ page: i + 1, text: chunk }))
  );
  if (pieces.length === 0) {
    return Response.json(
      { error: "No text found. Scanned (image-only) PDFs aren't supported yet." },
      { status: 422 }
    );
  }

  let vectors: number[][];
  try {
    vectors = await embedTexts(pieces.map((p) => p.text));
  } catch (err) {
    const message =
      err instanceof MissingKeyError
        ? "OPENAI_API_KEY is required to index documents."
        : `Embedding failed: ${err instanceof Error ? err.message : "unknown error"}`;
    return Response.json({ error: message }, { status: 502 });
  }

  const doc: DocumentInfo = {
    id: randomUUID(),
    name: file.name,
    pages: pages.length,
    chunks: pieces.length,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
  const chunks: Chunk[] = pieces.map((p, i) => ({
    id: `${doc.id}#${i}`,
    documentId: doc.id,
    page: p.page,
    text: p.text,
    embedding: vectors[i],
  }));
  await addDocument(doc, chunks);

  return Response.json({ document: doc }, { status: 201 });
}
