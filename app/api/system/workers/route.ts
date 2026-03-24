// GET /api/system/workers — Worker Status (Section 4)
// Read-only. Returns all worker nodes with health status.

import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET() {
  try {
    const { prisma } = createServices();

    const workers = await prisma.worker_nodes.findMany({
      orderBy: { last_heartbeat_at: "desc" },
    });

    const now = Date.now();
    const HEARTBEAT_THRESHOLD_MS = 30 * 1000; // 30 seconds

    const enriched = workers.map((w: any) => {
      const lastBeat = new Date(w.last_heartbeat_at).getTime();
      const staleSince = now - lastBeat;
      const derivedStatus = staleSince > HEARTBEAT_THRESHOLD_MS * 4
        ? "offline"
        : staleSince > HEARTBEAT_THRESHOLD_MS
        ? "degraded"
        : "online";

      return {
        id: w.id,
        hostname: w.hostname,
        status: w.status,
        derived_status: derivedStatus,
        last_heartbeat_at: w.last_heartbeat_at,
        heartbeat_age_ms: staleSince,
        active_runs_count: w.active_runs_count,
        cpu_usage_pct: w.cpu_usage_pct,
        memory_usage_pct: w.memory_usage_pct,
        docker_container_count: w.docker_container_count,
        disk_usage_pct: w.disk_usage_pct,
      };
    });

    return Response.json({
      workers: enriched,
      total: enriched.length,
      online: enriched.filter((w: any) => w.derived_status === "online").length,
      degraded: enriched.filter((w: any) => w.derived_status === "degraded").length,
      offline: enriched.filter((w: any) => w.derived_status === "offline").length,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
