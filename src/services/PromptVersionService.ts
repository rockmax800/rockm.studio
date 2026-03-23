// PromptVersionService — Manages versioned prompts for agent roles
// PART 1, 2, 3, 4: Version management, active prompt resolution, experiment routing, performance updates

import { logInfo, logError } from "@/lib/logger";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

export interface PromptVersionRecord {
  id: string;
  role_id: string;
  version_number: number;
  full_prompt: string;
  created_at: string;
  created_by: string;
  performance_snapshot: any;
  is_active: boolean;
}

export class PromptVersionService {
  private prisma: PrismaLike;
  private officeEmitter: OfficeEventEmitter;

  constructor(prisma: PrismaLike, officeEmitter: OfficeEventEmitter) {
    this.prisma = prisma;
    this.officeEmitter = officeEmitter;
  }

  /**
   * PART 2 — Resolve the effective prompt for a role, considering experiments.
   * Returns active PromptVersion, or falls back to role.prompt_template.
   */
  async resolvePromptForRole(roleId: string, runId?: string): Promise<{ prompt: string; versionId: string | null; experimentUsed: boolean }> {
    try {
      // Check for active experiment first (PART 3)
      const experiment = await this.prisma.prompt_experiments.findFirst({
        where: { role_id: roleId, status: "active" },
      }).catch(() => null);

      if (experiment) {
        // Route based on traffic_percentage
        const useExperimental = Math.random() * 100 < (experiment.traffic_percentage ?? 10);
        const versionId = useExperimental ? experiment.experimental_version_id : experiment.base_version_id;
        const version = await this.prisma.prompt_versions.findUniqueOrThrow({ where: { id: versionId } });

        logInfo("prompt_experiment_routing", {
          roleId,
          experimentId: experiment.id,
          useExperimental,
          versionId,
        });

        return { prompt: version.full_prompt, versionId: version.id, experimentUsed: useExperimental };
      }

      // Load active version
      const activeVersion = await this.prisma.prompt_versions.findFirst({
        where: { role_id: roleId, is_active: true },
      }).catch(() => null);

      if (activeVersion) {
        return { prompt: activeVersion.full_prompt, versionId: activeVersion.id, experimentUsed: false };
      }

      // Fallback to role.prompt_template
      const role = await this.prisma.agent_roles.findUniqueOrThrow({ where: { id: roleId } });
      return { prompt: role.prompt_template ?? "", versionId: null, experimentUsed: false };
    } catch (error) {
      logError("prompt_resolution_error", { roleId, error: error instanceof Error ? error.message : "unknown" });
      // Safe fallback
      try {
        const role = await this.prisma.agent_roles.findUniqueOrThrow({ where: { id: roleId } });
        return { prompt: role.prompt_template ?? "", versionId: null, experimentUsed: false };
      } catch {
        return { prompt: "", versionId: null, experimentUsed: false };
      }
    }
  }

  /**
   * Create a new prompt version (does NOT activate it).
   */
  async createVersion({
    roleId,
    fullPrompt,
    createdBy,
  }: {
    roleId: string;
    fullPrompt: string;
    createdBy: "system" | "founder";
  }): Promise<PromptVersionRecord> {
    const latestVersion = await this.prisma.prompt_versions.findFirst({
      where: { role_id: roleId },
      orderBy: { version_number: "desc" },
    }).catch(() => null);

    const nextVersion = (latestVersion?.version_number ?? 0) + 1;

    const version = await this.prisma.prompt_versions.create({
      data: {
        role_id: roleId,
        version_number: nextVersion,
        full_prompt: fullPrompt,
        created_by: createdBy,
        is_active: false,
        created_at: new Date().toISOString(),
      },
    });

    logInfo("prompt_version_created", { roleId, versionNumber: nextVersion, createdBy });
    return version;
  }

  /**
   * PART 6 — Activate a prompt version (founder-only action).
   * Deactivates all other versions for the same role.
   */
  async activateVersion(versionId: string, projectId?: string): Promise<PromptVersionRecord> {
    return this.prisma.$transaction(async (tx: any) => {
      const version = await tx.prompt_versions.findUniqueOrThrow({ where: { id: versionId } });

      // Deactivate all versions for this role
      await tx.prompt_versions.updateMany({
        where: { role_id: version.role_id },
        data: { is_active: false },
      });

      // Activate this one
      const activated = await tx.prompt_versions.update({
        where: { id: versionId },
        data: { is_active: true },
      });

      // Also sync to agent_roles.prompt_template for backward compat
      await tx.agent_roles.update({
        where: { id: version.role_id },
        data: {
          prompt_template: version.full_prompt,
          updated_at: new Date().toISOString(),
        },
      });

      logInfo("prompt_version_activated", { versionId, roleId: version.role_id, versionNumber: version.version_number });

      // Office event
      if (projectId) {
        try {
          await this.officeEmitter.emitOfficeEvent({
            projectId,
            entityType: "agent_role",
            entityId: version.role_id,
            eventType: "prompt_updated",
          });
        } catch { /* best-effort */ }
      }

      return activated;
    });
  }

  /**
   * PART 4 — Update performance snapshot on a prompt version after a run.
   */
  async updatePerformanceSnapshot({
    versionId,
    roleId,
  }: {
    versionId: string | null;
    roleId: string;
  }): Promise<void> {
    if (!versionId) return;

    try {
      // Gather evaluations linked to runs that used this version
      const evaluations = await this.prisma.run_evaluations.findMany({
        where: { role_id: roleId },
        orderBy: { created_at: "desc" },
        take: 50,
      });

      if (evaluations.length === 0) return;

      const successCount = evaluations.filter((e: any) => e.quality_score >= 0.7).length;
      const avgQuality = evaluations.reduce((s: number, e: any) => s + (e.quality_score ?? 0), 0) / evaluations.length;
      const avgLatency = evaluations.reduce((s: number, e: any) => s + (e.latency_ms ?? 0), 0) / evaluations.length;
      const avgCost = evaluations.reduce((s: number, e: any) => s + (e.cost_score ?? 0), 0) / evaluations.length;

      await this.prisma.prompt_versions.update({
        where: { id: versionId },
        data: {
          performance_snapshot: {
            success_rate: Math.round((successCount / evaluations.length) * 10000) / 10000,
            avg_quality_score: Math.round(avgQuality * 10000) / 10000,
            avg_latency: Math.round(avgLatency),
            avg_cost: Math.round(avgCost * 10000) / 10000,
            sample_size: evaluations.length,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logError("prompt_perf_snapshot_error", { versionId, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  /**
   * PART 3 — Start an A/B experiment.
   */
  async startExperiment({
    roleId,
    baseVersionId,
    experimentalVersionId,
    trafficPercentage,
    projectId,
  }: {
    roleId: string;
    baseVersionId: string;
    experimentalVersionId: string;
    trafficPercentage: number;
    projectId?: string;
  }) {
    const experiment = await this.prisma.prompt_experiments.create({
      data: {
        role_id: roleId,
        base_version_id: baseVersionId,
        experimental_version_id: experimentalVersionId,
        traffic_percentage: Math.max(1, Math.min(50, trafficPercentage)),
        status: "active",
        start_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    logInfo("prompt_experiment_started", { experimentId: experiment.id, roleId, trafficPercentage });

    if (projectId) {
      try {
        await this.officeEmitter.emitOfficeEvent({
          projectId,
          entityType: "agent_role",
          entityId: roleId,
          eventType: "prompt_experiment_started",
        });
      } catch { /* best-effort */ }
    }

    return experiment;
  }

  /**
   * End an experiment and compute performance delta.
   */
  async endExperiment(experimentId: string, projectId?: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const experiment = await tx.prompt_experiments.findUniqueOrThrow({ where: { id: experimentId } });

      const baseVersion = await tx.prompt_versions.findUniqueOrThrow({ where: { id: experiment.base_version_id } });
      const expVersion = await tx.prompt_versions.findUniqueOrThrow({ where: { id: experiment.experimental_version_id } });

      const performanceDelta = {
        base: baseVersion.performance_snapshot,
        experimental: expVersion.performance_snapshot,
      };

      const updated = await tx.prompt_experiments.update({
        where: { id: experimentId },
        data: {
          status: "completed",
          end_date: new Date().toISOString(),
          performance_delta: performanceDelta,
          updated_at: new Date().toISOString(),
        },
      });

      logInfo("prompt_experiment_ended", { experimentId, roleId: experiment.role_id });

      if (projectId) {
        try {
          await this.officeEmitter.emitOfficeEvent({
            projectId,
            entityType: "agent_role",
            entityId: experiment.role_id,
            eventType: "prompt_experiment_ended",
          });
        } catch { /* best-effort */ }
      }

      return updated;
    });
  }
}
