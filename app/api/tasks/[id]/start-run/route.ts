// POST /api/tasks/[id]/start-run — UC-03 Start Run

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Task ID required" }, { status: 400 });

    const { runService } = getServices();
    const run = await runService.startRun({ taskId: id, actorType: "system" });

    return Response.json(run, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
