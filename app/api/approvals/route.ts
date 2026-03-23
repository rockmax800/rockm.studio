// POST /api/approvals — UC-09 Request Approval

import { getServices, errorResponse } from "@/api/serviceFactory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, approval_type, target_type, target_id, requested_by_role_id, summary } = body;

    if (!project_id || !approval_type || !target_type || !target_id || !summary) {
      return Response.json(
        { error: "project_id, approval_type, target_type, target_id, summary are required" },
        { status: 400 },
      );
    }

    const { approvalService } = getServices();
    const approval = await approvalService.requestApproval({
      projectId: String(project_id),
      approvalType: String(approval_type),
      targetType: String(target_type),
      targetId: String(target_id),
      requestedByRoleId: requested_by_role_id ? String(requested_by_role_id) : null,
      summary: String(summary).trim().slice(0, 2000),
    });

    return Response.json(approval, { status: 201 });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
