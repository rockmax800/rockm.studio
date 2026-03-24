// GET /api/deployments/[id] — Deployment Diagnostics (Section 3)
// Read-only.

import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Deployment ID required" }, { status: 400 });

    const { prisma } = createServices();

    const result = await prisma.$transaction(async (tx: any) => {
      const deploy = await tx.deployments.findUniqueOrThrow({ where: { id } });

      let rollbackSource = null;
      if (deploy.rollback_of_deployment_id) {
        try {
          rollbackSource = await tx.deployments.findUnique({
            where: { id: deploy.rollback_of_deployment_id },
            select: { id: true, version_label: true, environment: true, status: true },
          });
        } catch { /* */ }
      }

      return {
        id: deploy.id,
        project_id: deploy.project_id,
        environment: deploy.environment,
        source_type: deploy.source_type,
        source_ref: deploy.source_ref,
        version_label: deploy.version_label,
        status: deploy.status,
        preview_url: deploy.preview_url,
        logs_ref: deploy.logs_ref,
        started_at: deploy.started_at,
        finished_at: deploy.finished_at,
        duration_ms: deploy.started_at && deploy.finished_at
          ? new Date(deploy.finished_at).getTime() - new Date(deploy.started_at).getTime()
          : null,
        rollback_of_deployment_id: deploy.rollback_of_deployment_id,
        rollback_source: rollbackSource,
        is_stuck: deploy.status === "deploying" && deploy.started_at
          ? (Date.now() - new Date(deploy.started_at).getTime()) > 15 * 60 * 1000
          : false,
      };
    });

    return Response.json(result);
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
