// UC-01 Activate Project
// UC-12 Complete Project Milestone
// Hardened with Serializable isolation

import { GuardError } from "@/guards/GuardError";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>, options?: any) => Promise<T>;
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

const REQUIRED_DOC_PATHS = [
  "docs/00-project-brief.md",
  "docs/04-domain-boundaries.md",
  "docs/05-lifecycle-state-machine.md",
];

export class ProjectService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
  }

  async activateProject(projectId: string, actorType: "founder" = "founder") {
    await this.prisma.$transaction(async (tx) => {
      const project = await tx.projects.findUniqueOrThrow({ where: { id: projectId } });

      if (project.state !== "scoped") {
        throw new GuardError({
          message: `Project must be in "scoped" state to activate. Current: "${project.state}"`,
          entityType: "project",
          entityId: projectId,
          fromState: project.state,
          toState: "active",
        });
      }

      const docs = await tx.documents.findMany({
        where: { project_id: projectId, file_path: { in: REQUIRED_DOC_PATHS } },
      });
      const foundPaths = new Set(docs.map((d: any) => d.file_path));
      const missingPaths = REQUIRED_DOC_PATHS.filter((p) => !foundPaths.has(p));
      if (missingPaths.length > 0) {
        throw new GuardError({
          message: `Missing required documents: ${missingPaths.join(", ")}`,
          entityType: "project",
          entityId: projectId,
          fromState: "scoped",
          toState: "active",
        });
      }

      const approval = await tx.approvals.findFirst({
        where: {
          project_id: projectId,
          approval_type: "project_activation",
          target_type: "project",
          target_id: projectId,
          state: "approved",
        },
      });
      if (!approval) {
        throw new GuardError({
          message: "No approved project_activation approval found",
          entityType: "project",
          entityId: projectId,
          fromState: "scoped",
          toState: "active",
        });
      }

      return null;
    }, { isolationLevel: "Serializable" });

    const updated = await this.orchestration.transitionEntity({
      entityType: "project",
      entityId: projectId,
      toState: "active",
      actorType,
      projectId,
      metadata: { use_case: "UC-01", trigger: "founder activates project" },
    });

    return updated;
  }

  async completeMilestone({
    projectId,
    actorType,
  }: {
    projectId: string;
    actorType: "founder";
  }) {
    if (actorType !== "founder") {
      throw new GuardError({
        message: "Only founder can complete a project milestone",
        entityType: "project",
        entityId: projectId,
        fromState: "in_review",
        toState: "completed",
      });
    }

    const { project, approval } = await this.prisma.$transaction(async (tx) => {
      const project = await tx.projects.findUniqueOrThrow({ where: { id: projectId } });

      if (project.state !== "in_review") {
        throw new GuardError({
          message: `Project must be in "in_review" state to complete milestone. Current: "${project.state}"`,
          entityType: "project",
          entityId: projectId,
          fromState: project.state,
          toState: "completed",
        });
      }

      const approval = await tx.approvals.findFirst({
        where: {
          project_id: projectId,
          approval_type: "release",
          target_type: "project",
          target_id: projectId,
          state: "approved",
        },
      });

      if (!approval) {
        throw new GuardError({
          message: "No approved release approval found for this project",
          entityType: "project",
          entityId: projectId,
          fromState: "in_review",
          toState: "completed",
        });
      }

      const nonTerminalTasks = await tx.tasks.count({
        where: {
          project_id: projectId,
          state: { notIn: ["done", "cancelled"] },
        },
      });

      if (nonTerminalTasks > 0) {
        throw new GuardError({
          message: `${nonTerminalTasks} task(s) are not in terminal state. All tasks must be done or cancelled.`,
          entityType: "project",
          entityId: projectId,
          fromState: "in_review",
          toState: "completed",
        });
      }

      return { project, approval };
    }, { isolationLevel: "Serializable" });

    const updated = await this.orchestration.transitionEntity({
      entityType: "project",
      entityId: projectId,
      toState: "completed",
      actorType,
      projectId,
      metadata: {
        use_case: "UC-12",
        trigger: "founder completes milestone",
        approval_id: approval.id,
      },
    });

    await this.orchestration.transitionEntity({
      entityType: "approval",
      entityId: approval.id,
      toState: "closed",
      actorType,
      projectId,
      metadata: {
        use_case: "UC-12",
        trigger: "release approval consumed by milestone completion",
      },
    });

    return updated;
  }
}
