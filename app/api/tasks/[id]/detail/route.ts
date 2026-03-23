// GET /api/tasks/[id]/detail — Full task detail

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Task ID required" }, { status: 400 });

    const { prisma } = getServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const task = await tx.tasks.findUniqueOrThrow({ where: { id } });

      const runs = await tx.runs.findMany({
        where: { task_id: id },
        orderBy: { run_number: "desc" },
      });

      const artifacts = await tx.artifacts.findMany({
        where: { task_id: id },
        orderBy: { created_at: "desc" },
      });

      const reviews = await tx.reviews.findMany({
        where: { task_id: id },
        orderBy: { created_at: "desc" },
      });

      const approvals = await tx.approvals.findMany({
        where: { target_type: "task", target_id: id },
        orderBy: { created_at: "desc" },
      });

      const contextPack = await tx.context_packs.findFirst({
        where: { task_id: id },
        orderBy: { created_at: "desc" },
      });

      return { task, runs, artifacts, reviews, approvals, contextPack };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
