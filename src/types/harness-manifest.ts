/**
 * Local Harness Manifest Types
 *
 * Lightweight, founder-controlled manifest structures for reusable
 * hooks, rules, and commands. These define the operational vocabulary
 * of the system without external dependencies.
 *
 * Not wired into runtime automation — serves as a structured registry
 * that UI and future execution layers can reference.
 */

export type ManifestScope = "system" | "project" | "role" | "task";
export type ManifestStatus = "active" | "draft" | "disabled";

export interface HookManifest {
  id: string;
  name: string;
  description: string;
  trigger: string;          // e.g. "before_release", "on_task_complete"
  scope: ManifestScope;
  status: ManifestStatus;
  action_summary: string;   // human-readable effect
  requires_founder_approval: boolean;
}

export interface RuleManifest {
  id: string;
  name: string;
  description: string;
  scope: ManifestScope;
  status: ManifestStatus;
  enforcement: "hard" | "soft";   // hard = blocks, soft = warns
  condition_summary: string;
  violation_message: string;
}

export interface CommandManifest {
  id: string;
  name: string;
  description: string;
  scope: ManifestScope;
  status: ManifestStatus;
  invoked_by: "founder" | "system" | "agent";
  effect_summary: string;
  requires_confirmation: boolean;
}
