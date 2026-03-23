// POST /api/projects/[id]/activate — UC-01 Activate Project

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Project ID required" }, { status: 400 });

    const { projectService } = getServices();
    const project = await projectService.activateProject(id, "founder");

    return Response.json(project);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
