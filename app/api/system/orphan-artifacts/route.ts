import { createServices, errorResponse } from "@/api/serviceFactory";
import { verifyAdminKey } from "@/api/adminAuth";

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma } = createServices();

    const allArtifacts = await prisma.artifacts.findMany({
      select: { id: true, title: true, task_id: true, run_id: true, state: true },
    });

    const orphans: Array<{ id: string; title: string; reason: string }> = [];

    for (const art of allArtifacts) {
      if (art.task_id) {
        const task = await prisma.tasks.findUnique({ where: { id: art.task_id }, select: { id: true } });
        if (!task) {
          orphans.push({ id: art.id, title: art.title, reason: `task_id ${art.task_id} does not exist` });
          continue;
        }
      }
      if (art.run_id) {
        const run = await prisma.runs.findUnique({ where: { id: art.run_id }, select: { id: true } });
        if (!run) {
          orphans.push({ id: art.id, title: art.title, reason: `run_id ${art.run_id} does not exist` });
        }
      }
    }

    return Response.json({ orphans, count: orphans.length, checkedAt: new Date().toISOString() });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
