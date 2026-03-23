// BottleneckPredictionService — Data-driven predictive bottleneck detection
// PART 4-7: Computes execution delays, review delays, and role overloads
// PART 9: No auto-escalation, no auto-reassign — only creates predictions

import { logInfo, logError } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

interface Prediction {
  task_id: string;
  prediction_type: string;
  confidence_score: number;
  explanation: string;
  role_id: string | null;
}

export class BottleneckPredictionService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Main entry: runs full prediction cycle.
   * Designed to be called every 5 minutes from a scheduled function.
   */
  async runPredictionCycle(): Promise<{ predictions: Prediction[]; duration_ms: number }> {
    const start = Date.now();
    const predictions: Prediction[] = [];

    try {
      // Gather data in parallel
      const [activeTasks, recentRuns, recentReviews, roleStats] = await Promise.all([
        this.getActiveTasks(),
        this.getRecentRunDurations(),
        this.getRecentReviewDurations(),
        this.getRoleTaskCounts(),
      ]);

      // PART 4 — Execution delay predictions
      const execDelays = this.predictExecutionDelays(activeTasks, recentRuns);
      predictions.push(...execDelays);

      // PART 4 — Review delay predictions
      const reviewDelays = this.predictReviewDelays(activeTasks, recentReviews);
      predictions.push(...reviewDelays);

      // PART 7 — Role overload detection
      const overloads = this.detectRoleOverloads(roleStats);
      predictions.push(...overloads);

      // PART 5 — Store predictions (clear old unresolved first)
      await this.storePredictions(predictions);

      logInfo("bottleneck_prediction_cycle_complete", {
        count: predictions.length,
        duration_ms: Date.now() - start,
      });
    } catch (error) {
      logError("bottleneck_prediction_cycle_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    return { predictions, duration_ms: Date.now() - start };
  }

  // ─── Data Gathering ───

  private async getActiveTasks() {
    return this.prisma.tasks.findMany({
      where: {
        state: { in: ["in_progress", "waiting_review", "assigned", "ready"] },
      },
      select: {
        id: true,
        state: true,
        owner_role_id: true,
        domain: true,
        updated_at: true,
        title: true,
      },
    });
  }

  private async getRecentRunDurations() {
    // Last 20 completed runs per role for avg duration
    const runs = await this.prisma.runs.findMany({
      where: {
        state: { in: ["finalized", "produced_output"] },
        duration_ms: { not: null },
      },
      select: {
        agent_role_id: true,
        duration_ms: true,
      },
      orderBy: { ended_at: "desc" },
      take: 200,
    });

    // Group by role, keep last 20 per role
    const byRole: Record<string, number[]> = {};
    for (const r of runs) {
      if (!byRole[r.agent_role_id]) byRole[r.agent_role_id] = [];
      if (byRole[r.agent_role_id].length < 20) {
        byRole[r.agent_role_id].push(r.duration_ms);
      }
    }

    // Compute averages
    const avgByRole: Record<string, number> = {};
    for (const [roleId, durations] of Object.entries(byRole)) {
      avgByRole[roleId] = durations.reduce((a, b) => a + b, 0) / durations.length;
    }
    return avgByRole;
  }

  private async getRecentReviewDurations() {
    // Reviews that have been closed — compute time from created to closed
    const reviews = await this.prisma.reviews.findMany({
      where: {
        state: { in: ["approved", "approved_with_notes", "rejected", "closed"] },
        closed_at: { not: null },
      },
      select: {
        task_id: true,
        created_at: true,
        closed_at: true,
      },
      orderBy: { closed_at: "desc" },
      take: 100,
    });

    const durations = reviews
      .filter((r: any) => r.closed_at)
      .map((r: any) => new Date(r.closed_at).getTime() - new Date(r.created_at).getTime());

    if (durations.length === 0) return 30 * 60 * 1000; // default 30min
    return durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
  }

  private async getRoleTaskCounts() {
    // Active tasks per role + completed tasks in last hour per role
    const [activeTasks, recentCompleted] = await Promise.all([
      this.prisma.tasks.findMany({
        where: { state: { in: ["in_progress", "assigned", "waiting_review"] } },
        select: { owner_role_id: true },
      }),
      this.prisma.tasks.findMany({
        where: {
          state: "done",
          closed_at: { gte: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
        },
        select: { owner_role_id: true },
      }),
    ]);

    const activeByRole: Record<string, number> = {};
    for (const t of activeTasks) {
      if (t.owner_role_id) activeByRole[t.owner_role_id] = (activeByRole[t.owner_role_id] ?? 0) + 1;
    }

    const completedByRole: Record<string, number> = {};
    for (const t of recentCompleted) {
      if (t.owner_role_id) completedByRole[t.owner_role_id] = (completedByRole[t.owner_role_id] ?? 0) + 1;
    }

    return { activeByRole, completedByRole };
  }

  // ─── Prediction Logic ───

  private predictExecutionDelays(
    tasks: any[],
    avgRunDurationByRole: Record<string, number>
  ): Prediction[] {
    const now = Date.now();
    const predictions: Prediction[] = [];

    for (const task of tasks) {
      if (task.state !== "in_progress") continue;
      if (!task.owner_role_id) continue;

      const avgDuration = avgRunDurationByRole[task.owner_role_id];
      if (!avgDuration) continue; // no data yet

      const timeInState = now - new Date(task.updated_at).getTime();
      const ratio = timeInState / avgDuration;

      if (ratio > 1.5) {
        // Confidence scales from 0.5 at 1.5x to 0.95 at 3x+
        const confidence = Math.min(0.95, 0.3 + (ratio - 1.5) * 0.25);
        predictions.push({
          task_id: task.id,
          prediction_type: "execution_delay",
          confidence_score: Math.round(confidence * 100) / 100,
          explanation: `Task "${task.title}" has been in_progress for ${Math.round(timeInState / 60000)}min, avg is ${Math.round(avgDuration / 60000)}min (${ratio.toFixed(1)}x slower)`,
          role_id: task.owner_role_id,
        });
      }
    }

    return predictions;
  }

  private predictReviewDelays(
    tasks: any[],
    avgReviewDuration: number
  ): Prediction[] {
    const now = Date.now();
    const predictions: Prediction[] = [];

    for (const task of tasks) {
      if (task.state !== "waiting_review") continue;

      const timeInState = now - new Date(task.updated_at).getTime();
      const ratio = timeInState / avgReviewDuration;

      if (ratio > 1.5) {
        const confidence = Math.min(0.95, 0.3 + (ratio - 1.5) * 0.25);
        predictions.push({
          task_id: task.id,
          prediction_type: "review_delay",
          confidence_score: Math.round(confidence * 100) / 100,
          explanation: `Task "${task.title}" waiting review for ${Math.round(timeInState / 60000)}min, avg review takes ${Math.round(avgReviewDuration / 60000)}min (${ratio.toFixed(1)}x slower)`,
          role_id: task.owner_role_id,
        });
      }
    }

    return predictions;
  }

  private detectRoleOverloads(
    roleStats: { activeByRole: Record<string, number>; completedByRole: Record<string, number> }
  ): Prediction[] {
    const predictions: Prediction[] = [];

    for (const [roleId, activeCount] of Object.entries(roleStats.activeByRole)) {
      const completedPerHour = roleStats.completedByRole[roleId] ?? 0;
      // If no completions in last hour, use 1 as baseline to avoid division by zero
      const baseline = Math.max(completedPerHour, 1);

      if (activeCount > baseline * 2) {
        const overloadRatio = activeCount / baseline;
        const confidence = Math.min(0.95, 0.4 + (overloadRatio - 2) * 0.15);
        predictions.push({
          task_id: "00000000-0000-0000-0000-000000000000", // role-level prediction
          prediction_type: "role_overload",
          confidence_score: Math.round(confidence * 100) / 100,
          explanation: `Role has ${activeCount} active tasks but only completed ${completedPerHour} in last hour (${overloadRatio.toFixed(1)}x overloaded)`,
          role_id: roleId,
        });
      }
    }

    return predictions;
  }

  // ─── Storage ───

  private async storePredictions(predictions: Prediction[]) {
    // Mark old unresolved predictions as resolved
    await this.prisma.bottleneck_predictions.updateMany({
      where: { resolved: false },
      data: { resolved: true },
    });

    // Insert new predictions
    if (predictions.length > 0) {
      for (const p of predictions) {
        await this.prisma.bottleneck_predictions.create({
          data: {
            task_id: p.task_id,
            prediction_type: p.prediction_type,
            confidence_score: p.confidence_score,
            explanation: p.explanation,
            role_id: p.role_id,
            resolved: false,
          },
        });
      }
    }
  }
}
