// GET /api/system/stalled — Stalled Detection Dashboard (Section 5)
// Read-only. Returns all stalled entities across runs, CI, deployments.

import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET() {
  try {
    const { prisma } = createServices();

    const now = Date.now();
    const TEN_MIN_AGO = new Date(now - 10 * 60 * 1000).toISOString();
    const FIFTEEN_MIN_AGO = new Date(now - 15 * 60 * 1000).toISOString();
    const TWO_MIN_AGO = new Date(now - 2 * 60 * 1000).toISOString();

    const [stalledRuns, stuckCI, stuckDeploys] = await Promise.all([
      // Runs with expired lease OR stale heartbeat
      prisma.runs.findMany({
        where: {
          state: { in: ["preparing", "running"] },
          OR: [
            { lease_expires_at: { lt: new Date().toISOString() } },
            { heartbeat_at: { lt: TWO_MIN_AGO } },
            { updated_at: { lt: TEN_MIN_AGO } },
          ],
        },
        select: {
          id: true,
          task_id: true,
          project_id: true,
          state: true,
          run_number: true,
          lease_owner: true,
          lease_expires_at: true,
          heartbeat_at: true,
          error_class: true,
          started_at: true,
          updated_at: true,
        },
        orderBy: { updated_at: "asc" },
        take: 50,
      }),

      // CI stuck in running
      prisma.check_suites.findMany({
        where: {
          status: "running",
          started_at: { lt: FIFTEEN_MIN_AGO },
        },
        select: {
          id: true,
          project_id: true,
          task_id: true,
          pull_request_id: true,
          status: true,
          started_at: true,
          external_run_ref: true,
        },
        orderBy: { started_at: "asc" },
        take: 20,
      }),

      // Deployments stuck in deploying
      prisma.deployments.findMany({
        where: {
          status: "deploying",
          started_at: { lt: FIFTEEN_MIN_AGO },
        },
        select: {
          id: true,
          project_id: true,
          environment: true,
          version_label: true,
          status: true,
          started_at: true,
          source_ref: true,
        },
        orderBy: { started_at: "asc" },
        take: 20,
      }),
    ]);

    // Enrich runs with stall reason
    const enrichedRuns = stalledRuns.map((r: any) => {
      const leaseExpired = r.lease_expires_at
        ? new Date(r.lease_expires_at).getTime() < now
        : false;
      const heartbeatStale = r.heartbeat_at
        ? (now - new Date(r.heartbeat_at).getTime()) > 2 * 60 * 1000
        : true;

      return {
        ...r,
        stall_reason: leaseExpired ? "lease_expired"
          : heartbeatStale ? "heartbeat_stale"
          : "no_update",
        stalled_duration_ms: r.updated_at
          ? now - new Date(r.updated_at).getTime()
          : null,
      };
    });

    return Response.json({
      stalled_runs: enrichedRuns,
      stuck_ci: stuckCI,
      stuck_deploys: stuckDeploys,
      summary: {
        stalled_runs_count: enrichedRuns.length,
        stuck_ci_count: stuckCI.length,
        stuck_deploys_count: stuckDeploys.length,
        total_issues: enrichedRuns.length + stuckCI.length + stuckDeploys.length,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
