// GET /api/runs/[id]/detail — Full run detail

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Run ID required" }, { status: 400 });

    const { prisma } = getServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const run = await tx.runs.findUniqueOrThrow({ where: { id } });

      const task = await tx.tasks.findUniqueOrThrow({ where: { id: run.task_id } });

      const artifacts = await tx.artifacts.findMany({
        where: { run_id: id },
        orderBy: { created_at: "desc" },
      });

      // Provider usage — best effort, table may not exist
      let providerUsage = null;
      try {
        providerUsage = await tx.provider_usage_logs.findMany({
          where: { run_id: id },
          orderBy: { created_at: "desc" },
        });
      } catch {
        providerUsage = [];
      }

      const activityFeed = await tx.activity_events.findMany({
        where: { entity_type: "run", entity_id: id },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      return { run, task, artifacts, providerUsage, activityFeed };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
