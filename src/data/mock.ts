import type { Project, Task, ActivityEvent, DocFile } from "@/types/workshop";

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "AI Workshop OS",
    purpose: "Internal agent-first development workspace",
    state: "active",
    activeTasks: 8,
    blockedTasks: 2,
    pendingApprovals: 3,
    updatedAt: "2026-03-23T10:30:00Z",
  },
  {
    id: "proj-2",
    name: "Auth Service Rebuild",
    purpose: "Redesign authentication with agent-driven review",
    state: "scoped",
    activeTasks: 0,
    blockedTasks: 0,
    pendingApprovals: 1,
    updatedAt: "2026-03-22T15:00:00Z",
  },
  {
    id: "proj-3",
    name: "Landing Page V2",
    purpose: "New product marketing page",
    state: "draft",
    activeTasks: 0,
    blockedTasks: 0,
    pendingApprovals: 0,
    updatedAt: "2026-03-21T09:00:00Z",
  },
];

export const mockTasks: Task[] = [
  { id: "task-1", title: "Define auth API contract", projectId: "proj-1", projectName: "AI Workshop OS", domain: "Backend Delivery", ownerRole: "Backend Architect", state: "in_progress", priority: "high", expectedArtifact: "API spec", updatedAt: "2026-03-23T09:00:00Z" },
  { id: "task-2", title: "Design DB schema for tasks", projectId: "proj-1", projectName: "AI Workshop OS", domain: "Backend Delivery", ownerRole: "Backend Architect", state: "blocked", priority: "blocker", expectedArtifact: "Schema artifact", updatedAt: "2026-03-23T08:30:00Z" },
  { id: "task-3", title: "Build dashboard overview", projectId: "proj-1", projectName: "AI Workshop OS", domain: "Frontend Delivery", ownerRole: "Frontend Builder", state: "waiting_review", priority: "normal", expectedArtifact: "Frontend artifact", updatedAt: "2026-03-23T07:45:00Z" },
  { id: "task-4", title: "Review migration plan", projectId: "proj-1", projectName: "AI Workshop OS", domain: "Review & QA", ownerRole: "Reviewer", state: "assigned", priority: "normal", expectedArtifact: "Review artifact", updatedAt: "2026-03-22T16:00:00Z" },
  { id: "task-5", title: "Create test cases for permissions", projectId: "proj-1", projectName: "AI Workshop OS", domain: "Review & QA", ownerRole: "QA Agent", state: "draft", priority: "normal", expectedArtifact: "Test artifact", updatedAt: "2026-03-22T14:00:00Z" },
];

export const mockActivity: ActivityEvent[] = [
  { id: "evt-1", type: "task_assigned", label: "Task assigned", objectName: "Define auth API contract", projectName: "AI Workshop OS", timestamp: "2026-03-23T10:30:00Z" },
  { id: "evt-2", type: "run_started", label: "Run started", objectName: "Run #12 — Dashboard build", projectName: "AI Workshop OS", timestamp: "2026-03-23T10:15:00Z" },
  { id: "evt-3", type: "artifact_created", label: "Artifact created", objectName: "domain-boundaries-v2.md", projectName: "AI Workshop OS", timestamp: "2026-03-23T09:50:00Z" },
  { id: "evt-4", type: "review_rejected", label: "Review rejected", objectName: "Schema draft v1", projectName: "AI Workshop OS", timestamp: "2026-03-23T09:20:00Z" },
  { id: "evt-5", type: "approval_granted", label: "Approval granted", objectName: "Project activation", projectName: "AI Workshop OS", timestamp: "2026-03-22T18:00:00Z" },
  { id: "evt-6", type: "task_created", label: "Task created", objectName: "Create test cases for permissions", projectName: "AI Workshop OS", timestamp: "2026-03-22T14:00:00Z" },
];

export const mockDocs: DocFile[] = [
  { id: "doc-1", name: "00-project-brief.md", path: "docs/00-project-brief.md", status: "canonical", version: 3, updatedBy: "Founder", updatedAt: "2026-03-23T08:00:00Z", linkedTasks: 2 },
  { id: "doc-2", name: "04-domain-boundaries.md", path: "docs/04-domain-boundaries.md", status: "canonical", version: 2, updatedBy: "Solution Architect", updatedAt: "2026-03-23T07:30:00Z", linkedTasks: 1 },
  { id: "doc-3", name: "05-lifecycle-state-machine.md", path: "docs/05-lifecycle-state-machine.md", status: "canonical", version: 1, updatedBy: "Solution Architect", updatedAt: "2026-03-22T16:00:00Z", linkedTasks: 0 },
  { id: "doc-4", name: "12-ai-collaboration-protocol.md", path: "docs/12-ai-collaboration-protocol.md", status: "canonical", version: 1, updatedBy: "Solution Architect", updatedAt: "2026-03-22T15:00:00Z", linkedTasks: 0 },
  { id: "doc-5", name: "13-lovable-ui-spec-v1.md", path: "docs/13-lovable-ui-spec-v1.md", status: "draft", version: 1, updatedBy: "Founder", updatedAt: "2026-03-23T10:00:00Z", linkedTasks: 3 },
];