// POST /api/runs/[id]/retry — UC-16 Retry Run

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Run ID required" }, { status: 400 });

    const { runService } = getServices();
    const run = await runService.retryRun(id);

    return Response.json(run, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
