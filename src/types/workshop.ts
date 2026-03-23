// Core entity types for AI Workshop OS

export type ProjectState = "draft" | "scoped" | "active" | "blocked" | "in_review" | "paused" | "completed" | "archived";
export type TaskState = "draft" | "ready" | "assigned" | "in_progress" | "waiting_review" | "rework_required" | "blocked" | "escalated" | "approved" | "done" | "cancelled";
export type RunState = "created" | "preparing" | "running" | "produced_output" | "failed" | "timed_out" | "cancelled" | "superseded" | "finalized";
export type ArtifactState = "created" | "classified" | "submitted" | "under_review" | "accepted" | "rejected" | "superseded" | "frozen" | "archived";
export type ReviewState = "created" | "in_progress" | "needs_clarification" | "approved" | "approved_with_notes" | "rejected" | "escalated" | "closed";
export type ApprovalState = "pending" | "approved" | "rejected" | "deferred" | "expired" | "closed";

export type EntityState = ProjectState | TaskState | RunState | ArtifactState | ReviewState | ApprovalState;

export type AgentRole = "Product Strategist" | "Solution Architect" | "Frontend Builder" | "Backend Architect" | "Backend Implementer" | "Reviewer" | "QA Agent" | "Release Coordinator";

export type Priority = "normal" | "high" | "blocker";
export type Domain = "Founder Control Plane" | "Product OS Docs" | "Task Orchestration" | "Agent Registry" | "Context Assembly" | "Execution Runs" | "Artifact Registry" | "Frontend Delivery" | "Backend Delivery" | "Review & QA" | "GitHub Integration" | "Observability & Audit";

export interface Project {
  id: string;
  name: string;
  purpose: string;
  state: ProjectState;
  activeTasks: number;
  blockedTasks: number;
  pendingApprovals: number;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  domain: string;
  ownerRole: AgentRole;
  state: TaskState;
  priority: Priority;
  expectedArtifact: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  label: string;
  objectName: string;
  projectName: string;
  timestamp: string;
}

export interface DocFile {
  id: string;
  name: string;
  path: string;
  status: "canonical" | "draft" | "review";
  version: number;
  updatedBy: string;
  updatedAt: string;
  linkedTasks: number;
}