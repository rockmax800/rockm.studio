// POST /api/reviews/[id]/reject — UC-07 Resolve Review (Reject)

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Review ID required" }, { status: 400 });

    const body = await request.json();
    const { reason, blocking_issues, actor_type } = body;

    if (!reason || String(reason).trim().length === 0) {
      return Response.json({ error: "reason is required for rejection" }, { status: 400 });
    }

    const { reviewService } = getServices();
    const result = await reviewService.rejectReview({
      reviewId: id,
      reason: String(reason).trim().slice(0, 5000),
      blockingIssues: blocking_issues,
      actorType: actor_type ?? "agent_role",
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
