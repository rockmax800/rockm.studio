// GET /api/projects/[id]/detail — Full project detail

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Project ID required" }, { status: 400 });

    const { prisma } = getServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const project = await tx.projects.findUniqueOrThrow({ where: { id } });

      const tasks = await tx.tasks.findMany({
        where: { project_id: id },
        orderBy: { updated_at: "desc" },
      });

      const artifacts = await tx.artifacts.findMany({
        where: { project_id: id },
        orderBy: { created_at: "desc" },
      });

      const reviews = await tx.reviews.findMany({
        where: { project_id: id },
        orderBy: { created_at: "desc" },
      });

      const approvals = await tx.approvals.findMany({
        where: { project_id: id },
        orderBy: { created_at: "desc" },
      });

      const activityFeed = await tx.activity_events.findMany({
        where: { project_id: id },
        orderBy: { created_at: "desc" },
        take: 50,
      });

      return { project, tasks, artifacts, reviews, approvals, activityFeed };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
