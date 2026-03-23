// GET /api/approvals/[id]/detail — Full approval detail with target

import { getServices, errorResponse } from "@/api/serviceFactory";

const TARGET_TABLE_MAP: Record<string, string> = {
  project: "projects",
  task: "tasks",
  artifact: "artifacts",
  review: "reviews",
  document: "documents",
};

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Approval ID required" }, { status: 400 });

    const { prisma } = getServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const approval = await tx.approvals.findUniqueOrThrow({ where: { id } });

      // Load target object
      let targetObject = null;
      const tableName = TARGET_TABLE_MAP[approval.target_type];
      if (tableName) {
        targetObject = await tx[tableName].findUnique({ where: { id: approval.target_id } });
      }

      // Related artifacts and reviews scoped to project
      const relatedArtifacts = await tx.artifacts.findMany({
        where: { project_id: approval.project_id },
        orderBy: { created_at: "desc" },
        take: 10,
      });

      const relatedReviews = await tx.reviews.findMany({
        where: { project_id: approval.project_id },
        orderBy: { created_at: "desc" },
        take: 10,
      });

      return { approval, targetObject, relatedArtifacts, relatedReviews };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
