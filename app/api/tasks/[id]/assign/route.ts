// POST /api/tasks/[id]/assign — UC-02 Assign Task

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Task ID required" }, { status: 400 });

    const body = await request.json();
    const { owner_role_id, actor_type } = body;

    if (!owner_role_id) {
      return Response.json({ error: "owner_role_id is required" }, { status: 400 });
    }

    const { taskService } = getServices();
    const task = await taskService.assignTask({
      taskId: id,
      ownerRoleId: String(owner_role_id),
      actorType: actor_type ?? "system",
    });

    return Response.json(task);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
