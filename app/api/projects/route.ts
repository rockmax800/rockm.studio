// POST /api/projects — Create project (state = scoped)

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, purpose, project_type, founder_notes } = body;

    if (!name || !slug || !purpose) {
      return Response.json({ error: "name, slug, and purpose are required" }, { status: 400 });
    }

    const { prisma } = getServices();
    const now = new Date().toISOString();

    const project = await prisma.$transaction(async (tx: any) => {
      return tx.projects.create({
        data: {
          name: String(name).trim().slice(0, 200),
          slug: String(slug).trim().slice(0, 100),
          purpose: String(purpose).trim().slice(0, 2000),
          project_type: project_type ? String(project_type).trim().slice(0, 100) : null,
          founder_notes: founder_notes ? String(founder_notes).trim().slice(0, 5000) : null,
          state: "scoped",
          created_at: now,
          updated_at: now,
        },
      });
    });

    return Response.json(project, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
