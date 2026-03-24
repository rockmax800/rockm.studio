// Stalled Run Detection Service
// Detects runs in "running" state with expired heartbeat.
// Does NOT auto-transition — produces soft flags for monitoring/alerting.

import { logInfo } from "@/lib/logger";

interface PrismaLike {
  [key: string]: any;
}

export interface StalledRun {
  runId: string;
  taskId: string;
  projectId: string;
  agentRoleId: string;
  lastHeartbeat: string | null;
  stalledDurationMs: number;
  correlationId: string | null;
  leaseOwner: string | null;
  leaseExpired: boolean;
}

const DEFAULT_STALL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class StalledRunDetector {
  private prisma: PrismaLike;
  private thresholdMs: number;

  constructor(prisma: PrismaLike, thresholdMs?: number) {
    this.prisma = prisma;
    this.thresholdMs = thresholdMs ?? DEFAULT_STALL_THRESHOLD_MS;
  }

  /**
   * Find all runs in "running" state where heartbeat_at is older than threshold.
   * Returns list of stalled runs for monitoring — does NOT change lifecycle state.
   */
  async detectStalledRuns(): Promise<StalledRun[]> {
    const cutoff = new Date(Date.now() - this.thresholdMs).toISOString();
    const now = Date.now();

    // Find runs that are "running" and have a heartbeat older than cutoff
    // OR runs that are "running" with no heartbeat at all (started_at older than cutoff)
    const stalledRuns = await this.prisma.runs?.findMany({
      where: {
        state: "running",
        OR: [
          { heartbeat_at: { lt: cutoff } },
          { heartbeat_at: null, started_at: { lt: cutoff } },
        ],
      },
      select: {
        id: true,
        task_id: true,
        project_id: true,
        agent_role_id: true,
        heartbeat_at: true,
        started_at: true,
        correlation_id: true,
        lease_owner: true,
        lease_expires_at: true,
      },
    });

    if (!stalledRuns || stalledRuns.length === 0) {
      return [];
    }

    const results: StalledRun[] = stalledRuns.map((run: any) => {
      const lastBeat = run.heartbeat_at ?? run.started_at;
      const stalledMs = lastBeat ? now - new Date(lastBeat).getTime() : this.thresholdMs;
      const leaseExpired = run.lease_expires_at
        ? new Date(run.lease_expires_at).getTime() < now
        : true;

      return {
        runId: run.id,
        taskId: run.task_id,
        projectId: run.project_id,
        agentRoleId: run.agent_role_id,
        lastHeartbeat: run.heartbeat_at,
        stalledDurationMs: stalledMs,
        correlationId: run.correlation_id,
        leaseOwner: run.lease_owner,
        leaseExpired,
      };
    });

    if (results.length > 0) {
      logInfo("stalled_runs_detected", {
        count: results.length,
        runIds: results.map((r) => r.runId),
      });
    }

    return results;
  }
}
