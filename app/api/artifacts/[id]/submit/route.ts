// POST /api/artifacts/[id]/submit — UC-05 Submit Artifact for Review

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Artifact ID required" }, { status: 400 });

    const body = await request.json();
    const { reviewer_role_id, actor_type } = body;

    if (!reviewer_role_id) {
      return Response.json({ error: "reviewer_role_id is required" }, { status: 400 });
    }

    const { artifactService } = getServices();
    const review = await artifactService.submitForReview({
      artifactId: id,
      reviewerRoleId: String(reviewer_role_id),
      actorType: actor_type ?? "system",
    });

    return Response.json(review, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
