// AutonomyPipelineService — Spec-to-Release autonomous pipeline
// All steps go through Task → Run → Artifact → Review lifecycle.
// No auto-approval. Founder remains final authority.

import { logInfo, logError } from "@/lib/logger";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

interface OrchestrationServiceLike {
  transitionEntity: (params: {
    entityType: string;
    entityId: string;
    toState: string;
    actorType: string;
    actorRoleId?: string | null;
    projectId: string;
    metadata?: Record<string, unknown>;
    guardContext?: Record<string, unknown>;
  }) => Promise<any>;
}

interface TaskServiceLike {
  assignTask: (params: { taskId: string; ownerRoleId: string; actorType: "system" | "founder" | "agent_role" }) => Promise<any>;
}

interface RunServiceLike {
  startRun: (params: { taskId: string; actorType: "system" | "agent_role" }) => Promise<any>;
}

export interface AutonomySettings {
  auto_generate_tasks: boolean;
  auto_execute_implementation: boolean;
  auto_retry_enabled: boolean;
  max_parallel_runs: number;
  max_autonomy_depth: number;
  autonomy_token_budget: number;
}

const DEFAULT_SETTINGS: AutonomySettings = {
  auto_generate_tasks: true,
  auto_execute_implementation: false,
  auto_retry_enabled: false,
  max_parallel_runs: 1,
  max_autonomy_depth: 3,
  autonomy_token_budget: 15000,
};

// Lean mode: pipeline stops after decomposition (depth 3)
const LEAN_PIPELINE_DEPTH: Record<string, number> = {
  idea: 0,
  spec: 1,
  architecture: 2,
  decomposition: 3,
  qa: 4,
  release: 5,
};

// Pipeline step definitions
const PIPELINE_STEPS = {
  idea: { domain: "docs", outputType: "document", roleCode: "product_strategist", title: "Draft Project Brief" },
  spec: { domain: "docs", outputType: "document", roleCode: "product_strategist", title: "Generate Detailed Product Spec" },
  architecture: { domain: "docs", outputType: "document", roleCode: "solution_architect", title: "Generate System Architecture Draft" },
  decomposition: { domain: "orchestration", outputType: "document", roleCode: "solution_architect", title: "Generate Implementation Task Breakdown" },
  qa: { domain: "qa", outputType: "test", roleCode: "qa_agent", title: "Generate QA Test Plan" },
  release: { domain: "release", outputType: "release", roleCode: "release_coordinator", title: "Generate Release Candidate" },
} as const;

type PipelineStep = keyof typeof PIPELINE_STEPS;

export class AutonomyPipelineService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;
  private taskService: TaskServiceLike;
  private runService: RunServiceLike;
  private officeEmitter: OfficeEventEmitter;

  constructor(
    prisma: PrismaLike,
    orchestration: OrchestrationServiceLike,
    taskService: TaskServiceLike,
    runService: RunServiceLike,
    officeEmitter: OfficeEventEmitter,
  ) {
    this.prisma = prisma;
    this.orchestration = orchestration;
    this.taskService = taskService;
    this.runService = runService;
    this.officeEmitter = officeEmitter;
  }

  // ─── Settings ───

  async getSettings(projectId: string): Promise<AutonomySettings> {
    const settings = await this.prisma.autonomy_settings.findUnique({
      where: { project_id: projectId },
    }).catch(() => null);
    return settings ?? DEFAULT_SETTINGS;
  }

  async updateSettings(projectId: string, updates: Partial<AutonomySettings>): Promise<AutonomySettings> {
    const existing = await this.prisma.autonomy_settings.findUnique({
      where: { project_id: projectId },
    }).catch(() => null);

    if (existing) {
      return this.prisma.autonomy_settings.update({
        where: { project_id: projectId },
        data: { ...updates, updated_at: new Date().toISOString() },
      });
    }
    return this.prisma.autonomy_settings.create({
      data: { project_id: projectId, ...DEFAULT_SETTINGS, ...updates },
    });
  }

  // ─── PART 1: Idea Intake ───

  async ingestIdea({ projectId, ideaText }: { projectId: string; ideaText: string }) {
    logInfo("autonomy_idea_intake", { projectId });

    const role = await this.resolveRole(PIPELINE_STEPS.idea.roleCode);
    const task = await this.createPipelineTask({
      projectId,
      step: "idea",
      purpose: ideaText,
      roleId: role.id,
    });

    // Assign + create context pack + start run
    await this.assignAndStartTask(task.id, role.id, projectId, ideaText);

    await this.officeEmitter.emitOfficeEvent({
      projectId,
      entityType: "task",
      entityId: task.id,
      eventType: "autonomy_idea_ingested",
    });

    return { taskId: task.id, step: "idea" };
  }

  // ─── PART 2: Spec Generation (after idea approved) ───

  async triggerSpec({ projectId, sourceTaskId }: { projectId: string; sourceTaskId: string }) {
    const settings = await this.getSettings(projectId);
    if (!settings.auto_generate_tasks) {
      logInfo("autonomy_spec_skipped", { projectId, reason: "auto_generate_tasks disabled" });
      return null;
    }

    // Token budget check
    const budgetOk = await this.checkTokenBudget(projectId, settings);
    if (!budgetOk) return null;

    // Depth check
    if (LEAN_PIPELINE_DEPTH.spec > settings.max_autonomy_depth) {
      logInfo("autonomy_spec_skipped", { projectId, reason: "exceeds max_autonomy_depth" });
      return null;
    }

    const sourceArtifact = await this.getLatestApprovedArtifact(sourceTaskId);
    // PART 4: Only include snapshot summary + last approved artifact, not full history
    const contextSummary = sourceArtifact
      ? `Based on approved brief:\n${(sourceArtifact.summary ?? sourceArtifact.title).slice(0, 2000)}`
      : "Generate detailed product spec.";

    const role = await this.resolveRole(PIPELINE_STEPS.spec.roleCode);
    const task = await this.createPipelineTask({
      projectId,
      step: "spec",
      purpose: `Generate detailed product spec.\n\n${contextSummary}`,
      roleId: role.id,
    });

    // Lean mode: auto-assign + start for planning tasks (spec/arch/decomp) only
    await this.assignAndStartTask(task.id, role.id, projectId, contextSummary);

    await this.officeEmitter.emitOfficeEvent({
      projectId, entityType: "task", entityId: task.id,
      eventType: "autonomy_spec_triggered",
    });

    return { taskId: task.id, step: "spec" };
  }

  // ─── PART 3: Architecture (after spec approved) ───

  async triggerArchitecture({ projectId, sourceTaskId }: { projectId: string; sourceTaskId: string }) {
    const settings = await this.getSettings(projectId);
    if (!settings.auto_generate_tasks) return null;

    const budgetOk = await this.checkTokenBudget(projectId, settings);
    if (!budgetOk) return null;

    if (LEAN_PIPELINE_DEPTH.architecture > settings.max_autonomy_depth) {
      logInfo("autonomy_arch_skipped", { projectId, reason: "exceeds max_autonomy_depth" });
      return null;
    }

    const sourceArtifact = await this.getLatestApprovedArtifact(sourceTaskId);
    const contextSummary = sourceArtifact
      ? `Based on approved spec:\n${(sourceArtifact.summary ?? sourceArtifact.title).slice(0, 2000)}`
      : "Generate system architecture.";

    const role = await this.resolveRole(PIPELINE_STEPS.architecture.roleCode);
    const task = await this.createPipelineTask({
      projectId,
      step: "architecture",
      purpose: `Generate system architecture draft.\n\n${contextSummary}`,
      roleId: role.id,
    });

    // Lean mode: auto-execute planning tasks
    await this.assignAndStartTask(task.id, role.id, projectId, contextSummary);

    await this.officeEmitter.emitOfficeEvent({
      projectId, entityType: "task", entityId: task.id,
      eventType: "autonomy_architecture_triggered",
    });

    return { taskId: task.id, step: "architecture" };
  }

  // ─── PART 4: Task Decomposition (after architecture approved) ───

  async triggerDecomposition({ projectId, sourceTaskId }: { projectId: string; sourceTaskId: string }) {
    const settings = await this.getSettings(projectId);
    if (!settings.auto_generate_tasks) return null;

    const budgetOk = await this.checkTokenBudget(projectId, settings);
    if (!budgetOk) return null;

    if (LEAN_PIPELINE_DEPTH.decomposition > settings.max_autonomy_depth) {
      logInfo("autonomy_decomp_skipped", { projectId, reason: "exceeds max_autonomy_depth" });
      return null;
    }

    const sourceArtifact = await this.getLatestApprovedArtifact(sourceTaskId);
    const contextSummary = sourceArtifact
      ? `Based on approved architecture:\n${(sourceArtifact.summary ?? sourceArtifact.title).slice(0, 2000)}`
      : "Generate implementation task breakdown.";

    const role = await this.resolveRole(PIPELINE_STEPS.decomposition.roleCode);
    const task = await this.createPipelineTask({
      projectId,
      step: "decomposition",
      purpose: `Generate implementation task breakdown including frontend, backend, schema, and QA tasks.\n\n${contextSummary}`,
      roleId: role.id,
    });

    // Lean mode: auto-execute decomposition (planning task)
    await this.assignAndStartTask(task.id, role.id, projectId, contextSummary);

    await this.officeEmitter.emitOfficeEvent({
      projectId, entityType: "task", entityId: task.id,
      eventType: "autonomy_decomposition_triggered",
    });

    return { taskId: task.id, step: "decomposition" };
  }

  // ─── PART 5: Implementation Loop (DISABLED in lean mode) ───

  async executeImplementationTasks({
    projectId,
    taskIds,
  }: {
    projectId: string;
    taskIds: string[];
  }) {
    const settings = await this.getSettings(projectId);

    // Lean mode: always disabled
    if (!settings.auto_execute_implementation) {
      logInfo("autonomy_impl_disabled", { projectId, reason: "lean mode — auto_execute_implementation=false" });
      return { started: 0, skipped: taskIds.length, reason: "Implementation disabled in lean mode. Tasks remain in ready state for founder." };
    }

    // Respect max_parallel_runs
    const activeRuns = await this.prisma.runs.count({
      where: {
        project_id: projectId,
        state: { in: ["created", "preparing", "running"] },
      },
    });

    const available = Math.max(0, settings.max_parallel_runs - activeRuns);
    const toStart = taskIds.slice(0, available);
    let started = 0;

    for (const taskId of toStart) {
      try {
        const task = await this.prisma.tasks.findUniqueOrThrow({ where: { id: taskId } });
        if (!task.owner_role_id) continue;
        if (task.state !== "assigned") continue;

        await this.runService.startRun({ taskId, actorType: "system" });
        started++;

        await this.officeEmitter.emitOfficeEvent({
          projectId, entityType: "task", entityId: taskId,
          eventType: "autonomy_impl_started",
        });
      } catch (error) {
        logError("autonomy_impl_start_failed", {
          taskId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return { started, skipped: taskIds.length - started };
  }

  // ─── PART 6: QA Task (DISABLED in lean mode) ───

  async triggerQA({ projectId }: { projectId: string }) {
    const settings = await this.getSettings(projectId);
    if (!settings.auto_generate_tasks) return null;

    // Lean mode: QA is depth 4, beyond default max_autonomy_depth=3
    if (LEAN_PIPELINE_DEPTH.qa > settings.max_autonomy_depth) {
      logInfo("autonomy_qa_skipped", { projectId, reason: "exceeds max_autonomy_depth (lean mode)" });
      return { skipped: true, reason: "QA auto-generation disabled in lean mode" };
    }

    const role = await this.resolveRole(PIPELINE_STEPS.qa.roleCode);
    const task = await this.createPipelineTask({
      projectId,
      step: "qa",
      purpose: "Generate QA test plan, risk list, and validation criteria for all implementation artifacts.",
      roleId: role.id,
    });

    // Never auto-execute in lean mode
    if (settings.auto_execute_implementation) {
      await this.assignAndStartTask(task.id, role.id, projectId, "QA test plan generation");
    }

    await this.officeEmitter.emitOfficeEvent({
      projectId, entityType: "task", entityId: task.id,
      eventType: "autonomy_qa_triggered",
    });

    return { taskId: task.id, step: "qa" };
  }

  // ─── PART 7: Release Candidate (DISABLED in lean mode) ───

  async triggerRelease({ projectId }: { projectId: string }) {
    const settings = await this.getSettings(projectId);
    if (!settings.auto_generate_tasks) return null;

    // Lean mode: Release is depth 5, beyond default max_autonomy_depth=3
    if (LEAN_PIPELINE_DEPTH.release > settings.max_autonomy_depth) {
      logInfo("autonomy_release_skipped", { projectId, reason: "exceeds max_autonomy_depth (lean mode)" });
      return { skipped: true, reason: "Release auto-generation disabled in lean mode" };
    }

    const role = await this.resolveRole(PIPELINE_STEPS.release.roleCode);
    const task = await this.createPipelineTask({
      projectId,
      step: "release",
      purpose: "Generate release candidate with summary, checklist, and deployment notes.",
      roleId: role.id,
    });

    if (settings.auto_execute_implementation) {
      await this.assignAndStartTask(task.id, role.id, projectId, "Release candidate generation");
    }

    await this.officeEmitter.emitOfficeEvent({
      projectId, entityType: "task", entityId: task.id,
      eventType: "autonomy_release_triggered",
    });

    return { taskId: task.id, step: "release" };
  }

  // ─── PART 8: Pipeline Status ───

  async getPipelineStatus(projectId: string) {
    const tasks = await this.prisma.tasks.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: "asc" },
      select: {
        id: true, title: true, state: true, domain: true,
        expected_output_type: true, created_at: true, updated_at: true,
      },
    });

    const settings = await this.getSettings(projectId);
    const activeRuns = await this.prisma.runs.count({
      where: {
        project_id: projectId,
        state: { in: ["created", "preparing", "running"] },
      },
    });

    return { tasks, settings, activeRuns };
  }

  // ─── Helpers ───

  private async resolveRole(roleCode: string) {
    const role = await this.prisma.agent_roles.findFirst({
      where: { code: roleCode, status: "active" },
    });
    if (!role) {
      throw new Error(`No active agent role found for code: ${roleCode}`);
    }
    return role;
  }

  private async createPipelineTask({
    projectId,
    step,
    purpose,
    roleId,
  }: {
    projectId: string;
    step: PipelineStep;
    purpose: string;
    roleId: string;
  }) {
    const stepDef = PIPELINE_STEPS[step];

    const task = await this.prisma.tasks.create({
      data: {
        project_id: projectId,
        title: stepDef.title,
        purpose,
        domain: stepDef.domain,
        expected_output_type: stepDef.outputType,
        owner_role_id: roleId,
        state: "draft",
        priority: "medium",
        acceptance_criteria: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    // Transition draft → ready via OrchestrationService
    await this.orchestration.transitionEntity({
      entityType: "task",
      entityId: task.id,
      toState: "ready",
      actorType: "system",
      projectId,
    });

    logInfo("autonomy_task_created", { step, taskId: task.id, projectId });
    return task;
  }

  private async assignAndStartTask(taskId: string, roleId: string, projectId: string, contextSummary: string) {
    // Assign
    await this.taskService.assignTask({
      taskId,
      ownerRoleId: roleId,
      actorType: "system",
    });

    // Create context pack
    await this.prisma.context_packs.create({
      data: {
        project_id: projectId,
        task_id: taskId,
        summary: contextSummary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    // Start run
    await this.runService.startRun({ taskId, actorType: "system" });
  }

  private async getLatestApprovedArtifact(taskId: string) {
    // PART 4: Only return summary + title, not full content — limit context size
    return this.prisma.artifacts.findFirst({
      where: { task_id: taskId, state: { in: ["accepted", "frozen"] } },
      orderBy: { created_at: "desc" },
      select: { id: true, title: true, summary: true, state: true },
    }).catch(() => null);
  }

  // ─── PART 5: Token Budget Enforcement ───

  private async checkTokenBudget(projectId: string, settings: AutonomySettings): Promise<boolean> {
    try {
      const usageLogs = await this.prisma.provider_usage_logs.findMany({
        where: { project_id: projectId },
        select: { total_tokens: true },
      });

      const totalTokens = usageLogs.reduce((sum: number, log: any) => sum + (log.total_tokens ?? 0), 0);

      if (totalTokens >= settings.autonomy_token_budget) {
        logInfo("autonomy_budget_exceeded", { projectId, totalTokens, budget: settings.autonomy_token_budget });

        // Create escalation task for founder
        try {
          const role = await this.resolveRole("product_strategist");
          await this.prisma.tasks.create({
            data: {
              project_id: projectId,
              title: "Autonomy budget exceeded — manual review required",
              purpose: `Autonomy token budget of ${settings.autonomy_token_budget} tokens exceeded (used: ${totalTokens}). Pipeline halted. Founder must review and decide next steps.`,
              domain: "founder_control",
              expected_output_type: "document",
              owner_role_id: role.id,
              state: "draft",
              priority: "high",
              urgency: "blocker",
              acceptance_criteria: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });

          await this.officeEmitter.emitOfficeEvent({
            projectId,
            entityType: "project",
            entityId: projectId,
            eventType: "autonomy_budget_exceeded",
          });
        } catch { /* best-effort escalation */ }

        return false;
      }

      return true;
    } catch {
      // If we can't check budget, allow execution
      return true;
    }
  }
}
