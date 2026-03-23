// Pipeline trigger endpoint — triggers next step in autonomy pipeline.
// POST with { projectId, step, sourceTaskId? }
// Steps: spec, architecture, decomposition, qa, release, implement

import { verifyAdminKey } from "@/api/adminAuth";
import { createServices, errorResponse } from "@/api/serviceFactory";

export async function POST(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const { projectId, step, sourceTaskId, taskIds } = body;

    if (!projectId || !step) {
      return Response.json({ error: "projectId and step are required" }, { status: 400 });
    }

    const { autonomyPipelineService } = createServices();
    let result: any;

    switch (step) {
      case "spec":
        if (!sourceTaskId) return Response.json({ error: "sourceTaskId required for spec" }, { status: 400 });
        result = await autonomyPipelineService.triggerSpec({ projectId, sourceTaskId });
        break;

      case "architecture":
        if (!sourceTaskId) return Response.json({ error: "sourceTaskId required for architecture" }, { status: 400 });
        result = await autonomyPipelineService.triggerArchitecture({ projectId, sourceTaskId });
        break;

      case "decomposition":
        if (!sourceTaskId) return Response.json({ error: "sourceTaskId required for decomposition" }, { status: 400 });
        result = await autonomyPipelineService.triggerDecomposition({ projectId, sourceTaskId });
        break;

      case "implement":
        if (!taskIds || !Array.isArray(taskIds)) return Response.json({ error: "taskIds array required for implement" }, { status: 400 });
        result = await autonomyPipelineService.executeImplementationTasks({ projectId, taskIds });
        break;

      case "qa":
        result = await autonomyPipelineService.triggerQA({ projectId });
        break;

      case "release":
        result = await autonomyPipelineService.triggerRelease({ projectId });
        break;

      default:
        return Response.json({ error: `Unknown step: ${step}. Valid: spec, architecture, decomposition, implement, qa, release` }, { status: 400 });
    }

    return Response.json(result ?? { skipped: true, reason: "auto_generate_tasks disabled" });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
