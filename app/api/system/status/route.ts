import { createServices, errorResponse } from "@/api/serviceFactory";
import { verifyAdminKey } from "@/api/adminAuth";

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma, providerService } = createServices();

    const [
      providers,
      activeRunsCount,
      blockedTasksCount,
      escalatedTasksCount,
      pendingApprovalsCount,
      lastEvent,
    ] = await Promise.all([
      prisma.providers.findMany({ select: { id: true, name: true, status: true } }),
      prisma.runs.count({ where: { state: { in: ["created", "preparing", "running"] } } }),
      prisma.tasks.count({ where: { state: "blocked" } }),
      prisma.tasks.count({ where: { state: "escalated" } }),
      prisma.approvals.count({ where: { state: "pending" } }),
      prisma.activity_events.findFirst({ orderBy: { created_at: "desc" }, select: { created_at: true } }),
    ]);

    return Response.json({
      dbConnected: true,
      providerHealth: providers.map((p: any) => ({ providerId: p.id, name: p.name, status: p.status })),
      activeRunsCount,
      blockedTasksCount,
      escalatedTasksCount,
      pendingApprovalsCount,
      lastActivityTimestamp: lastEvent?.created_at ?? null,
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json({ dbConnected: false, ...body }, { status });
  }
}
