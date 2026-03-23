// POST /api/approvals/[id]/resolve — UC-10 Resolve Approval

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Approval ID required" }, { status: 400 });

    const body = await request.json();
    const { decision, decision_note } = body;

    const validDecisions = ["approved", "rejected", "deferred"];
    if (!decision || !validDecisions.includes(decision)) {
      return Response.json({ error: `decision must be one of: ${validDecisions.join(", ")}` }, { status: 400 });
    }

    if (!decision_note || String(decision_note).trim().length === 0) {
      return Response.json({ error: "decision_note is required" }, { status: 400 });
    }

    const { approvalService } = getServices();
    const approval = await approvalService.resolveApproval({
      approvalId: id,
      decision,
      decisionNote: String(decision_note).trim().slice(0, 5000),
      actorType: "founder",
    });

    return Response.json(approval);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
