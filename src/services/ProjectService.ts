// UC-01 Activate Project
// Requires:
// - approved project_activation approval
// - required core documents (00-project-brief, 04-domain-boundaries, 05-lifecycle-state-machine)
// - scoped state
// Transition:
// scoped → active

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
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
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
    return this.prisma.$transaction(async (tx) => {
      // 1. Load project
      const project = await tx.projects.findUniqueOrThrow({
        where: { id: projectId },
      });

      // 2. Ensure project is in scoped state
      if (project.state !== "scoped") {
        throw new GuardError({
          message: `Project must be in "scoped" state to activate. Current state: "${project.state}"`,
          entityType: "project",
          entityId: projectId,
          fromState: project.state,
          toState: "active",
        });
      }

      // 3. Validate required documents exist
      const docs = await tx.documents.findMany({
        where: {
          project_id: projectId,
          file_path: { in: REQUIRED_DOC_PATHS },
        },
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

      // 4. Ensure approved project_activation approval exists
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
          message: "No approved project_activation approval found for this project",
          entityType: "project",
          entityId: projectId,
          fromState: "scoped",
          toState: "active",
        });
      }

      return null; // validation passed inside transaction
    }).then(async () => {
      // 5-6. Delegate state transition to OrchestrationService
      // OrchestrationService handles its own transaction, guard call, and activity event
      const updated = await this.orchestration.transitionEntity({
        entityType: "project",
        entityId: projectId,
        toState: "active",
        actorType,
        projectId,
        metadata: {
          use_case: "UC-01",
          trigger: "founder activates project",
        },
      });

      return updated;
    });
  }
}
