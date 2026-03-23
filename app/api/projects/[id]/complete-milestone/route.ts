// POST /api/projects/[id]/complete-milestone — UC-12 Complete Project Milestone

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Project ID required" }, { status: 400 });

    const { projectService } = getServices();
    const project = await projectService.completeMilestone({ projectId: id, actorType: "founder" });

    return Response.json(project);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
