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
import { RetryPolicyService } from "@/services/RetryPolicyService";
import { SelfReviewService } from "@/services/SelfReviewService";
import { ContextCompressionService } from "@/services/ContextCompressionService";
import { DualVerificationService } from "@/services/DualVerificationService";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";

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
  const providerService = new ProviderService(prisma);
  const officeEmitter = new OfficeEventEmitter(prisma);
  const runService = new RunService(prisma, orchestration);

  return {
    prisma,
    orchestration,
    performanceService,
    providerService,
    officeEmitter,
    projectService: new ProjectService(prisma, orchestration),
    taskService: new TaskService(prisma, orchestration),
    runService,
    artifactService: new ArtifactService(prisma, orchestration),
    reviewService: new ReviewService(prisma, orchestration, performanceService),
    approvalService: new ApprovalService(prisma, orchestration),
    retryPolicyService: new RetryPolicyService(prisma, runService, officeEmitter),
    selfReviewService: new SelfReviewService(prisma),
    contextCompressionService: new ContextCompressionService(prisma),
    dualVerificationService: new DualVerificationService(prisma, officeEmitter),
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
