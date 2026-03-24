// Delivery Spine Service — Manages Repository, Workspace, PR, CheckSuite, Deployment entities.
// Additive layer: no modifications to existing workflow engine.
// All entities traceable to Project → Task → Run.

import { GuardError } from "@/guards/GuardError";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<{ count: number }>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

// ──────────────────────────────────────────────
// Repo Workspace creation (called from RunService)
// ──────────────────────────────────────────────

export interface CreateWorkspaceParams {
  projectId: string;
  taskId: string;
  runId: string;
  repositoryId: string;
  branchName: string;
  sandboxMode?: "isolated" | "host";
}

export interface CreatePullRequestParams {
  projectId: string;
  taskId: string;
  runId: string;
  repositoryId: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
}

export class DeliverySpineService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Create a repo workspace for a run that modifies code.
   * Called by RunService when task.domain is frontend or backend.
   */
  async createWorkspace(params: CreateWorkspaceParams) {
    const workspace = await this.prisma.$transaction(async (tx) => {
      // Validate repository exists
      await tx.repositories.findUniqueOrThrow({ where: { id: params.repositoryId } });

      // Validate run exists
      await tx.runs.findUniqueOrThrow({ where: { id: params.runId } });

      const workspace = await tx.repo_workspaces.create({
        data: {
          project_id: params.projectId,
          task_id: params.taskId,
          run_id: params.runId,
          repository_id: params.repositoryId,
          branch_name: params.branchName,
          sandbox_mode: params.sandboxMode ?? "isolated",
          status: "created",
          created_at: new Date().toISOString(),
        },
      });

      // Emit activity event
      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: params.taskId,
          event_type: "workspace.created",
          project_id: params.projectId,
          actor_type: "system",
          event_payload: {
            workspace_id: workspace.id,
            run_id: params.runId,
            repository_id: params.repositoryId,
            branch_name: params.branchName,
          },
        },
      });

      return workspace;
    }, { isolationLevel: "Serializable" });

    return workspace;
  }

  /**
   * Create a logical pull request record.
   * Called after review validation (no actual GitHub API call yet).
   */
  async createPullRequest(params: CreatePullRequestParams) {
    const pr = await this.prisma.$transaction(async (tx) => {
      // Validate repository exists
      const repo = await tx.repositories.findUniqueOrThrow({ where: { id: params.repositoryId } });

      const pr = await tx.pull_requests.create({
        data: {
          project_id: params.projectId,
          task_id: params.taskId,
          run_id: params.runId,
          repository_id: params.repositoryId,
          source_branch: params.sourceBranch,
          target_branch: params.targetBranch,
          title: params.title,
          status: "opened",
          opened_at: new Date().toISOString(),
        },
      });

      // Emit activity event
      await tx.activity_events.create({
        data: {
          entity_type: "task",
          entity_id: params.taskId,
          event_type: "pull_request.opened",
          project_id: params.projectId,
          actor_type: "system",
          event_payload: {
            pull_request_id: pr.id,
            run_id: params.runId,
            repository_id: params.repositoryId,
            source_branch: params.sourceBranch,
            target_branch: params.targetBranch,
          },
        },
      });

      return pr;
    }, { isolationLevel: "Serializable" });

    return pr;
  }

  /**
   * Find the default repository for a project (if any).
   */
  async findProjectRepository(projectId: string) {
    return this.prisma.repositories?.findFirst({
      where: { project_id: projectId, status: "active" },
      orderBy: { created_at: "asc" },
    });
  }

  /**
   * Find workspace for a specific run.
   */
  async findRunWorkspace(runId: string) {
    return this.prisma.repo_workspaces?.findFirst({
      where: { run_id: runId },
    });
  }
}
