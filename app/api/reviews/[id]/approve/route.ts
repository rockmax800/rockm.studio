// POST /api/reviews/[id]/approve — UC-06 Resolve Review (Approve)

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Review ID required" }, { status: 400 });

    const body = await request.json();
    const { verdict, non_blocking_notes, actor_type } = body;

    const validVerdicts = ["approved", "approved_with_notes"];
    const v = verdict ?? "approved";
    if (!validVerdicts.includes(v)) {
      return Response.json({ error: `verdict must be one of: ${validVerdicts.join(", ")}` }, { status: 400 });
    }

    const { reviewService } = getServices();
    const result = await reviewService.approveReview({
      reviewId: id,
      verdict: v,
      nonBlockingNotes: non_blocking_notes,
      actorType: actor_type ?? "agent_role",
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
