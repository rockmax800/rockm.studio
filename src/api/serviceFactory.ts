// Shared service factory — instantiates all services with safePrisma
// Used by API route handlers to avoid duplication.

import { createSafePrisma } from "@/lib/safePrisma";
import { OrchestrationService } from "@/services/OrchestrationService";
import { ProjectService } from "@/services/ProjectService";
import { TaskService } from "@/services/TaskService";
import { RunService } from "@/services/RunService";
import { ArtifactService } from "@/services/ArtifactService";
import { ReviewService } from "@/services/ReviewService";
import { ApprovalService } from "@/services/ApprovalService";
import { ProviderService } from "@/services/ProviderService";
import { AgentPerformanceService } from "@/services/AgentPerformanceService";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

let _rawPrisma: PrismaLike | null = null;

export function setRawPrisma(prisma: PrismaLike) {
  _rawPrisma = prisma;
}

export function getServices() {
  if (!_rawPrisma) {
    throw new Error("Prisma not initialized. Call setRawPrisma() first.");
  }

  const prisma = createSafePrisma(_rawPrisma);
  const orchestration = new OrchestrationService(prisma);
  const performanceService = new AgentPerformanceService(prisma);

  return {
    prisma,
    orchestration,
    performanceService,
    projectService: new ProjectService(prisma, orchestration),
    taskService: new TaskService(prisma, orchestration),
    runService: new RunService(prisma, orchestration),
    artifactService: new ArtifactService(prisma, orchestration),
    reviewService: new ReviewService(prisma, orchestration, performanceService),
    approvalService: new ApprovalService(prisma, orchestration),
    providerService: new ProviderService(prisma),
  };
}

// Alias for convenience
export const createServices = getServices;

export function errorResponse(error: unknown, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const isGuardError = error instanceof Error && error.name === "GuardError";
  const isConcurrencyError = error instanceof Error && error.name === "ConcurrencyError";
  const isTimeoutError = error instanceof Error && error.message.toLowerCase().includes("timed out");
  const status = isGuardError ? 400 : isConcurrencyError ? 409 : isTimeoutError ? 504 : fallbackStatus;
  return { status, body: { error: message } };
}
