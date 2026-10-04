import type { DocumentInfo, Source } from "./types";

async function errorMessage(res: Response) {
  const body = await res.json().catch(() => null);
  return body?.error ?? `Request failed (HTTP ${res.status}).`;
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).documents;
}

export async function uploadDocument(file: File): Promise<DocumentInfo> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/documents", { method: "POST", body: form });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export async function searchDocuments(query: string): Promise<Source[]> {
  const res = await fetch("/api/rag/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()).sources;
}
