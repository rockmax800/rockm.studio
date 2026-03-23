// POST /api/tasks/[id]/complete — UC-11 Complete Task

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Task ID required" }, { status: 400 });

    const { taskService } = getServices();
    const task = await taskService.completeTask({ taskId: id, actorType: "founder" });

    return Response.json(task);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
