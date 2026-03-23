// PART 3 — Intelligent Load Balancer
// Selects the best available role for a task based on load, performance, and domain fit.
// PART 9 — Safety: never reassigns in_progress/escalated/blocked tasks, respects founder overrides.

import { getRoleLoadMetrics, type RoleLoadMetrics } from "./RoleLoadService";

interface TaskForBalancing {
  domain: string;
  project_id: string;
  owner_role_id?: string | null;
  state: string;
  team_id?: string | null; // from project
}

interface BalancerConfig {
  multiTeamEnabled?: boolean;
  crossTeamAllowed?: boolean;
}

export interface BalancerResult {
  selected_role_id: string;
  selected_role_name: string;
  score: number;
  reason: string;
}

/**
 * PART 3 — selectBestRoleForTask
 * 1) Filter by domain compatibility + active status
 * 2) Exclude overloaded roles (active >= max_parallel)
 * 3) Score and return highest
 *
 * PART 6 — In multi-team mode, prefer same-team roles; cross-team only if allowed + no team match.
 */
export async function selectBestRoleForTask(
  task: TaskForBalancing,
  config: BalancerConfig = {}
): Promise<BalancerResult | null> {
  // PART 9 — Safety: do not reassign tasks already in progress
  if (["in_progress", "escalated", "blocked"].includes(task.state)) {
    return null;
  }

  // PART 9 — Do not override founder manual assignment
  if (task.owner_role_id) {
    return null;
  }

  const metrics = await getRoleLoadMetrics();

  // DOMAIN_MAP: maps task domain enum to allowed_domains entries
  const domainKey = task.domain;

  // Step 1: Filter by domain compatibility
  let candidates = metrics.filter((r) => {
    if (!r.allowed_domains || r.allowed_domains.length === 0) return true;
    return r.allowed_domains.includes(domainKey);
  });

  // Step 2: Exclude overloaded
  candidates = candidates.filter((r) => r.active_tasks_count < r.max_parallel_tasks);

  if (candidates.length === 0) return null;

  // PART 6 — Team filtering
  if (config.multiTeamEnabled && task.team_id) {
    const sameTeam = candidates.filter((r) => r.team_id === task.team_id);
    if (sameTeam.length > 0) {
      candidates = sameTeam;
    } else if (!config.crossTeamAllowed) {
      // No same-team roles and cross-team not allowed
      return null;
    }
    // else: fall through with all candidates (cross-team allowed)
  }

  // Step 3: Score
  const scored = candidates.map((r) => ({
    ...r,
    score: computeScore(r),
  }));

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  return {
    selected_role_id: best.role_id,
    selected_role_name: best.role_name,
    score: Math.round(best.score * 1000) / 1000,
    reason: `Score ${best.score.toFixed(3)} (load: ${best.active_tasks_count}/${best.max_parallel_tasks}, success: ${(best.success_rate * 100).toFixed(0)}%)`,
  };
}

function computeScore(r: RoleLoadMetrics): number {
  const loadFactor = (1 / (1 + r.active_tasks_count)) * 0.4;
  const successFactor = r.success_rate * 0.3;
  const perfFactor = Math.min(r.performance_score, 1) * 0.2;
  const speedFactor = r.avg_run_duration_ms > 0
    ? (1 / (1 + r.avg_run_duration_ms / 60000)) * 0.1
    : 0.05;
  return loadFactor + successFactor + perfFactor + speedFactor;
}

/**
 * PART 5 — Overload reallocation: find alternate role for ready tasks
 * when current role is overloaded.
 */
export async function findReallocationTarget(
  task: TaskForBalancing,
  currentRoleId: string,
  config: BalancerConfig = {}
): Promise<BalancerResult | null> {
  if (task.state !== "ready") return null;

  const metrics = await getRoleLoadMetrics();
  const currentRole = metrics.find((r) => r.role_id === currentRoleId);
  if (!currentRole || !currentRole.predicted_overload) return null;

  // Find alternatives in same domain, excluding current role
  const taskWithoutOwner = { ...task, owner_role_id: null };
  const allCandidates = metrics.filter((r) => {
    if (r.role_id === currentRoleId) return false;
    if (r.active_tasks_count >= r.max_parallel_tasks) return false;
    if (r.allowed_domains && r.allowed_domains.length > 0) {
      return r.allowed_domains.includes(task.domain);
    }
    return true;
  });

  if (allCandidates.length === 0) return null;

  // Apply team filtering
  let candidates = allCandidates;
  if (config.multiTeamEnabled && task.team_id) {
    const sameTeam = candidates.filter((r) => r.team_id === task.team_id);
    if (sameTeam.length > 0) {
      candidates = sameTeam;
    } else if (!config.crossTeamAllowed) {
      return null;
    }
  }

  const scored = candidates.map((r) => ({ ...r, score: computeScore(r) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    selected_role_id: best.role_id,
    selected_role_name: best.role_name,
    score: Math.round(best.score * 1000) / 1000,
    reason: `Reallocation from overloaded role. Score ${best.score.toFixed(3)}`,
  };
}
