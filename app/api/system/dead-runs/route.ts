import { createServices, errorResponse } from "@/api/serviceFactory";
import { verifyAdminKey } from "@/api/adminAuth";

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma } = createServices();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const deadRuns = await prisma.runs.findMany({
      where: {
        state: { in: ["preparing", "running"] },
        updated_at: { lt: tenMinutesAgo },
      },
      select: {
        id: true,
        task_id: true,
        project_id: true,
        state: true,
        run_number: true,
        started_at: true,
        updated_at: true,
        agent_role_id: true,
        failure_reason: true,
      },
      orderBy: { updated_at: "asc" },
    });

    return Response.json({ deadRuns, count: deadRuns.length, checkedAt: new Date().toISOString() });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
