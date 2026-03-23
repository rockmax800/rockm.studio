// POST /api/tasks — Create task (state = ready)

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, title, purpose, domain, expected_output_type, priority, acceptance_criteria } = body;

    if (!project_id || !title || !purpose || !domain || !expected_output_type) {
      return Response.json({ error: "project_id, title, purpose, domain, expected_output_type are required" }, { status: 400 });
    }

    const { prisma } = getServices();
    const now = new Date().toISOString();

    const task = await prisma.$transaction(async (tx: any) => {
      return tx.tasks.create({
        data: {
          project_id: String(project_id),
          title: String(title).trim().slice(0, 500),
          purpose: String(purpose).trim().slice(0, 2000),
          domain: String(domain),
          expected_output_type: String(expected_output_type),
          priority: priority ? String(priority) : "medium",
          acceptance_criteria: acceptance_criteria ?? [],
          state: "ready",
          created_at: now,
          updated_at: now,
        },
      });
    });

    return Response.json(task, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
