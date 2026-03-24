// GET /api/system/resources — Resource Monitoring (Section 6)
// Read-only. Returns basic system metrics from worker nodes + DB aggregates.

import { createServices, errorResponse } from "@/api/serviceFactory";

export async function GET() {
  try {
    const { prisma } = createServices();

    const [workers, activeRuns, totalRuns, pendingOutbox] = await Promise.all([
      prisma.worker_nodes.findMany({
        select: {
          hostname: true,
          cpu_usage_pct: true,
          memory_usage_pct: true,
          docker_container_count: true,
          disk_usage_pct: true,
          status: true,
        },
      }),
      prisma.runs.count({ where: { state: { in: ["preparing", "running"] } } }),
      prisma.runs.count({}),
      prisma.outbox_events.count({ where: { status: "pending" } }),
    ]);

    // Aggregate worker metrics
    const avgCpu = workers.length > 0
      ? workers.reduce((sum: number, w: any) => sum + (Number(w.cpu_usage_pct) || 0), 0) / workers.length
      : null;
    const avgMemory = workers.length > 0
      ? workers.reduce((sum: number, w: any) => sum + (Number(w.memory_usage_pct) || 0), 0) / workers.length
      : null;
    const totalContainers = workers.reduce((sum: number, w: any) => sum + (w.docker_container_count || 0), 0);
    const maxDisk = workers.length > 0
      ? Math.max(...workers.map((w: any) => Number(w.disk_usage_pct) || 0))
      : null;

    // Pressure warnings
    const warnings: string[] = [];
    if (avgCpu !== null && avgCpu > 80) warnings.push("High CPU usage across workers");
    if (avgMemory !== null && avgMemory > 85) warnings.push("High memory usage across workers");
    if (maxDisk !== null && maxDisk > 90) warnings.push("Disk usage critical on at least one worker");
    if (pendingOutbox > 100) warnings.push("Outbox backlog growing — possible dispatch issues");

    return Response.json({
      workers: {
        count: workers.length,
        avg_cpu_pct: avgCpu ? Math.round(avgCpu * 10) / 10 : null,
        avg_memory_pct: avgMemory ? Math.round(avgMemory * 10) / 10 : null,
        total_docker_containers: totalContainers,
        max_disk_usage_pct: maxDisk ? Math.round(maxDisk * 10) / 10 : null,
      },
      runs: {
        active: activeRuns,
        total: totalRuns,
      },
      outbox: {
        pending: pendingOutbox,
      },
      warnings,
      pressure_level: warnings.length === 0 ? "normal"
        : warnings.length <= 2 ? "elevated"
        : "critical",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return Response.json(body, { status });
  }
}
