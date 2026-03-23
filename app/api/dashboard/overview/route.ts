// GET /api/dashboard/overview — Founder overview dashboard

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function GET() {
  try {
    const { prisma } = getServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const projects = await tx.projects.findMany({
        where: { state: { notIn: ["archived"] } },
        orderBy: { updated_at: "desc" },
      });

      const projectIds = projects.map((p: any) => p.id);

      const tasks = projectIds.length
        ? await tx.tasks.findMany({ where: { project_id: { in: projectIds } } })
        : [];

      const projectSummaries = projects.map((p: any) => {
        const projectTasks = tasks.filter((t: any) => t.project_id === p.id);
        return {
          id: p.id,
          name: p.name,
          state: p.state,
          activeTasksCount: projectTasks.filter((t: any) => !["done", "cancelled"].includes(t.state)).length,
          blockedTasksCount: projectTasks.filter((t: any) => t.state === "blocked").length,
          pendingApprovalsCount: 0,
        };
      });

      const pendingApprovals = await tx.approvals.findMany({
        where: { state: "pending" },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      // Patch approval counts into project summaries
      for (const a of pendingApprovals) {
        const ps = projectSummaries.find((p: any) => p.id === a.project_id);
        if (ps) ps.pendingApprovalsCount++;
      }

      const recentlyFailedRuns = await tx.runs.findMany({
        where: { state: "failed" },
        orderBy: { updated_at: "desc" },
        take: 10,
      });

      const escalatedTasks = await tx.tasks.findMany({
        where: { state: "escalated" },
        orderBy: { updated_at: "desc" },
        take: 10,
      });

      return { projects: projectSummaries, pendingApprovals, recentlyFailedRuns, escalatedTasks };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
