import { promises as fs } from "node:fs";
import path from "node:path";
import type { DocumentInfo } from "@/lib/types";

export interface Chunk {
  id: string;
  documentId: string;
  page: number;
  text: string;
  embedding: number[];
}

interface IndexFile {
  documents: DocumentInfo[];
  chunks: Chunk[];
}

const INDEX_PATH = path.join(process.cwd(), "data", "rag-index.json");

let cache: IndexFile | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<IndexFile> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(INDEX_PATH, "utf8")) as IndexFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    cache = { documents: [], chunks: [] };
  }
  return cache;
}

async function save(index: IndexFile) {
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  const tmp = `${INDEX_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(index));
  await fs.rename(tmp, INDEX_PATH);
}

// Serializes writes so concurrent uploads don't overwrite each other.
function mutate<T>(fn: (index: IndexFile) => T): Promise<T> {
  const run = queue.then(async () => {
    const index = await load();
    const result = fn(index);
    await save(index);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  return (await load()).documents;
}

export async function allChunks(): Promise<Chunk[]> {
  return (await load()).chunks;
}

export function addDocument(doc: DocumentInfo, chunks: Chunk[]) {
  return mutate((index) => {
    index.documents.push(doc);
    index.chunks.push(...chunks);
  });
}

export function removeDocument(id: string) {
  return mutate((index) => {
    const before = index.documents.length;
    index.documents = index.documents.filter((d) => d.id !== id);
    index.chunks = index.chunks.filter((c) => c.documentId !== id);
    return index.documents.length !== before;
  });
}
