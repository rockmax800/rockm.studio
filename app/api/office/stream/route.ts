import { verifyAdminKey } from "@/api/adminAuth";
import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET(req: Request) {
  const auth = verifyAdminKey(req);
  if (!auth.authorized) return auth.response!;

  try {
    const { prisma } = createServices();

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
    const projectId = url.searchParams.get("project_id");

    const where: any = {};
    if (projectId) where.project_id = projectId;

    const events = await prisma.office_events.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return Response.json({ events, count: events.length });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
