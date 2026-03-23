// PART 1 — Idea Intake Endpoint
// POST: Ingest a product idea, create draft task, assign, and start run.

import { verifyAdminKey } from "@/api/adminAuth";
import { createServices, errorResponse } from "@/api/serviceFactory";

export async function POST(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { projectId, ideaText } = body;

    if (!projectId || !ideaText) {
      return Response.json({ error: "projectId and ideaText are required" }, { status: 400 });
    }

    const { autonomyPipelineService } = createServices();
    const result = await autonomyPipelineService.ingestIdea({ projectId, ideaText });

    return Response.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
