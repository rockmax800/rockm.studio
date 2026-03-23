// Autonomy settings + pipeline status endpoint
// GET: returns pipeline status for a project
// PUT: updates autonomy settings

import { verifyAdminKey } from "@/api/adminAuth";
import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    if (!projectId) return Response.json({ error: "project_id required" }, { status: 400 });

    const { autonomyPipelineService } = createServices();
    const status = await autonomyPipelineService.getPipelineStatus(projectId);
    return Response.json(status);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}

export async function PUT(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { projectId, ...settings } = body;
    if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 });

    const { autonomyPipelineService } = createServices();
    const updated = await autonomyPipelineService.updateSettings(projectId, settings);
    return Response.json(updated);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
