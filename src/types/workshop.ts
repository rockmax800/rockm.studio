// Core entity types for AI Workshop OS
// v2.2 — Lifecycle/Outcome separation + Delivery Spine

export type ProjectState = "draft" | "scoped" | "active" | "blocked" | "in_review" | "paused" | "completed" | "archived";

// Task: 'approved' replaced by 'validated' (review passed, ready for next step)
export type TaskState = "draft" | "ready" | "assigned" | "in_progress" | "waiting_review" | "rework_required" | "blocked" | "escalated" | "validated" | "done" | "cancelled";

export type RunState = "created" | "preparing" | "running" | "produced_output" | "failed" | "timed_out" | "cancelled" | "superseded" | "finalized";
export type ArtifactState = "created" | "classified" | "submitted" | "under_review" | "accepted" | "rejected" | "superseded" | "frozen" | "archived";

// Review: lifecycle_state only — verdict is a separate field
export type ReviewLifecycleState = "created" | "in_progress" | "needs_clarification" | "resolved" | "closed";
/** @deprecated Use ReviewLifecycleState + ReviewVerdict instead */
export type ReviewState = ReviewLifecycleState;
export type ReviewVerdict = "approved" | "approved_with_notes" | "rejected" | "escalated" | null;

// Approval: lifecycle_state only — decision is a separate field
export type ApprovalLifecycleState = "pending" | "decided" | "expired" | "closed";
/** @deprecated Use ApprovalLifecycleState + ApprovalDecision instead */
export type ApprovalState = ApprovalLifecycleState;
export type ApprovalDecision = "approved" | "rejected" | "deferred" | null;

// Handoff: collaboration contract between roles
export type HandoffOutcome = "implementation" | "review" | "clarification" | "approval_prep" | "qa" | "release";
export type HandoffStatus = "created" | "acknowledged" | "completed" | "cancelled";

// Delivery Spine types
export type RepoProvider = "github" | "gitea" | "gitlab" | "other";
export type RepoStatus = "active" | "archived";
export type WorkspaceStatus = "created" | "active" | "merged" | "discarded";
export type SandboxMode = "isolated" | "host";
export type PRStatus = "opened" | "merged" | "closed";
export type CheckSuiteStatus = "queued" | "running" | "passed" | "failed";
export type CIProvider = "github_actions" | "other";
export type DeployEnvironment = "staging" | "production" | "preview";
export type DeploySourceType = "branch" | "pr" | "tag";
export type DeployStatus = "pending" | "deploying" | "live" | "failed" | "rolled_back";
export type DomainBindingStatus = "active" | "misconfigured" | "pending";
export type DomainTargetType = "ip" | "cname" | "platform";

export type EntityState = ProjectState | TaskState | RunState | ArtifactState | ReviewLifecycleState | ApprovalLifecycleState;

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
