import { MissingKeyError } from "@/lib/providers/errors";
import { searchDocuments } from "@/lib/rag/search";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const query = body?.query;
  if (typeof query !== "string" || !query.trim()) {
    return Response.json({ error: "query is required." }, { status: 400 });
  }

  try {
    return Response.json({ sources: await searchDocuments(query) });
  } catch (err) {
    const message =
      err instanceof MissingKeyError
        ? "OPENAI_API_KEY is required to search documents."
        : `Document search failed: ${err instanceof Error ? err.message : "unknown error"}`;
    return Response.json({ error: message }, { status: 502 });
  }
}
