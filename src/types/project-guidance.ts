// Project Guidance Pack — structured operating rules derived from project context

export interface GuidanceEntry {
  label: string;
  value: string;
  source: "brief" | "blueprint" | "founder" | "generated";
}

export interface GuidanceGroup {
  key: string;
  title: string;
  icon: string; // lucide icon name for reference
  entries: GuidanceEntry[];
}

export interface ProjectGuidancePack {
  projectId: string;
  projectName: string;
  groups: GuidanceGroup[];
  generatedAt: string;
  isDraft: boolean; // true = derived locally, not persisted
}

/** Derive a guidance pack from available project data */
export function deriveGuidancePack(project: {
  id: string;
  name: string;
  purpose?: string | null;
  state?: string;
  founder_notes?: string | null;
  current_phase?: string | null;
}, context?: {
  taskCount?: number;
  blockedCount?: number;
  failedRunCount?: number;
  pendingApprovalCount?: number;
  hasCI?: boolean;
  hasDomain?: boolean;
  riskLevel?: string;
}): ProjectGuidancePack {
  const groups: GuidanceGroup[] = [];

  // 1. Product Intent
  const intentEntries: GuidanceEntry[] = [];
  if (project.purpose) {
    intentEntries.push({ label: "Business Goal", value: project.purpose, source: "brief" });
  }
  if (project.current_phase) {
    intentEntries.push({ label: "Current Phase", value: project.current_phase, source: "generated" });
  }
  if (project.state) {
    intentEntries.push({ label: "Project State", value: project.state, source: "generated" });
  }
  groups.push({
    key: "intent",
    title: "Product Intent",
    icon: "Target",
    entries: intentEntries.length > 0 ? intentEntries : [{ label: "Status", value: "No business goal defined yet", source: "generated" }],
  });

  // 2. Delivery Constraints
  const deliveryEntries: GuidanceEntry[] = [];
  if (context?.taskCount !== undefined) {
    deliveryEntries.push({ label: "Total Tasks", value: String(context.taskCount), source: "generated" });
  }
  if (context?.blockedCount && context.blockedCount > 0) {
    deliveryEntries.push({ label: "Blocked Tasks", value: `${context.blockedCount} — requires unblocking before progress`, source: "generated" });
  }
  if (context?.hasCI !== undefined) {
    deliveryEntries.push({ label: "CI Pipeline", value: context.hasCI ? "Connected" : "Not configured — runs are not CI-verified", source: "generated" });
  }
  groups.push({
    key: "delivery",
    title: "Delivery Constraints",
    icon: "Truck",
    entries: deliveryEntries.length > 0 ? deliveryEntries : [{ label: "Status", value: "No delivery data yet", source: "generated" }],
  });

  // 3. Quality Expectations
  const qualityEntries: GuidanceEntry[] = [];
  qualityEntries.push({ label: "Review Required", value: "All artifacts must pass review before acceptance", source: "generated" });
  qualityEntries.push({ label: "Auto-pass Disabled", value: "No task completes without explicit verification evidence", source: "generated" });
  if (context?.failedRunCount && context.failedRunCount > 0) {
    qualityEntries.push({ label: "Failed Runs", value: `${context.failedRunCount} — investigate before continuing`, source: "generated" });
  }
  groups.push({
    key: "quality",
    title: "Quality Expectations",
    icon: "BadgeCheck",
    entries: qualityEntries,
  });

  // 4. Security Concerns
  const securityEntries: GuidanceEntry[] = [];
  securityEntries.push({ label: "Domain Isolation", value: "Agents must not access files outside their assigned domain", source: "generated" });
  securityEntries.push({ label: "Secret Governance", value: "No secrets in code — runtime-only injection", source: "generated" });
  if (!context?.hasDomain) {
    securityEntries.push({ label: "Domain Binding", value: "Not configured — production DNS not verified", source: "generated" });
  }
  groups.push({
    key: "security",
    title: "Security Concerns",
    icon: "ShieldAlert",
    entries: securityEntries,
  });

  // 5. Review Priorities
  const reviewEntries: GuidanceEntry[] = [];
  if (context?.pendingApprovalCount && context.pendingApprovalCount > 0) {
    reviewEntries.push({ label: "Pending Approvals", value: `${context.pendingApprovalCount} decision(s) waiting for founder`, source: "generated" });
  }
  reviewEntries.push({ label: "Review Policy", value: "Founder approval required for scope, architecture, and release decisions", source: "generated" });
  reviewEntries.push({ label: "Rework Handling", value: "Rejected artifacts return to agent for revision — no silent discard", source: "generated" });
  groups.push({
    key: "review",
    title: "Review Priorities",
    icon: "Eye",
    entries: reviewEntries,
  });

  // 6. Open Risks
  const riskEntries: GuidanceEntry[] = [];
  if (context?.riskLevel) {
    riskEntries.push({ label: "Risk Level", value: context.riskLevel, source: "generated" });
  }
  if (project.founder_notes) {
    riskEntries.push({ label: "Founder Notes", value: project.founder_notes, source: "founder" });
  }
  if (!context?.hasCI) {
    riskEntries.push({ label: "Missing CI", value: "No automated checks — delivery is not gate-verified", source: "generated" });
  }
  if (riskEntries.length === 0) {
    riskEntries.push({ label: "Status", value: "No elevated risks identified", source: "generated" });
  }
  groups.push({
    key: "risks",
    title: "Open Risks",
    icon: "AlertTriangle",
    entries: riskEntries,
  });

  return {
    projectId: project.id,
    projectName: project.name,
    groups,
    generatedAt: new Date().toISOString(),
    isDraft: true,
  };
}
