import { createServices, errorResponse } from "@/api/serviceFactory";
import { verifyAdminKey } from "@/api/adminAuth";

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma } = createServices();

    const [projects, tasks, runs, artifacts, reviews, approvals, activity_events] = await Promise.all([
      prisma.projects.findMany({ orderBy: { created_at: "desc" } }),
      prisma.tasks.findMany({ orderBy: { created_at: "desc" } }),
      prisma.runs.findMany({ orderBy: { created_at: "desc" } }),
      prisma.artifacts.findMany({ orderBy: { created_at: "desc" } }),
      prisma.reviews.findMany({ orderBy: { created_at: "desc" } }),
      prisma.approvals.findMany({ orderBy: { created_at: "desc" } }),
      prisma.activity_events.findMany({ orderBy: { created_at: "desc" } }),
    ]);

    return Response.json({
      exportedAt: new Date().toISOString(),
      projects,
      tasks,
      runs,
      artifacts,
      reviews,
      approvals,
      activity_events,
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
