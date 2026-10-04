import { removeDocument } from "@/lib/rag/store";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: RouteContext<"/api/documents/[id]">
) {
  const { id } = await context.params;
  const removed = await removeDocument(id);
  return removed
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Document not found." }, { status: 404 });
}
