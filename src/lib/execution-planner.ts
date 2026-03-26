// Execution Planner — orders TaskSpec drafts by dependency and safe parallelism.
// Intent Plane artifact — does NOT create Delivery Plane state.

import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { EngineeringLayer } from "@/types/engineering-slices";
import type { ExecutionEdge, ExecutionBatch, ExecutionPlanDraft } from "@/types/execution-plan";

// ── Layer ordering: lower layers must execute before higher layers ──

const LAYER_ORDER: Record<EngineeringLayer, number> = {
  migration: 0,
  domain_model: 1,
  dto_or_contract: 2,
  application_service: 3,
  api_handler: 4,
  integration_adapter: 4,
  ui_component: 5,
  test: 6,
};

export interface PlanWarning {
  type: "cycle" | "missing_dependency" | "unsafe_parallel";
  message: string;
  affectedIds: string[];
}

export interface ExecutionPlanResult {
  plan: ExecutionPlanDraft;
  warnings: PlanWarning[];
}

/**
 * Build a dependency-aware execution plan from TaskSpec drafts.
 * Deterministic — same input always produces same output.
 */
export function buildExecutionPlan(
  drafts: TaskSpecDraft[],
  blueprintId: string = "draft",
): ExecutionPlanResult {
  const warnings: PlanWarning[] = [];
  const draftMap = new Map(drafts.map((d) => [d.id, d]));

  // 1. Build dependency edges
  const edges = inferEdges(drafts);

  // 2. Check for cycles
  const cycleNodes = detectCycles(drafts, edges);
  if (cycleNodes.length > 0) {
    warnings.push({
      type: "cycle",
      message: `Dependency cycle detected among ${cycleNodes.length} specs — forced into sequential batches.`,
      affectedIds: cycleNodes,
    });
  }

  // 3. Check for missing dependencies
  for (const edge of edges) {
    if (!draftMap.has(edge.fromTaskDraftId)) {
      warnings.push({
        type: "missing_dependency",
        message: `Dependency source "${edge.fromTaskDraftId}" not found in drafts.`,
        affectedIds: [edge.toTaskDraftId],
      });
    }
  }

  // 4. Topological sort into batches
  const batches = topologicalBatch(drafts, edges, cycleNodes);

  // 5. Check for unsafe parallelism (same module + overlapping repo paths in same batch)
  for (const batch of batches) {
    const batchDrafts = batch.taskDraftIds.map((id) => draftMap.get(id)).filter(Boolean) as TaskSpecDraft[];
    const modulePairs = findUnsafeParallel(batchDrafts);
    for (const [a, b] of modulePairs) {
      warnings.push({
        type: "unsafe_parallel",
        message: `"${a.title}" and "${b.title}" share repo paths in batch ${batch.batchNumber} — review parallelism.`,
        affectedIds: [a.id, b.id],
      });
    }
  }

  // 6. Compute critical path
  const criticalPath = computeCriticalPath(drafts, edges, batches);

  const plan: ExecutionPlanDraft = {
    id: `plan-${blueprintId}`,
    blueprintId,
    taskDraftIds: drafts.map((d) => d.id),
    edges,
    batches,
    criticalPath,
    notes: warnings.map((w) => `[${w.type}] ${w.message}`),
  };

  return { plan, warnings };
}

// ── Edge inference ──

function inferEdges(drafts: TaskSpecDraft[]): ExecutionEdge[] {
  const edges: ExecutionEdge[] = [];
  // Group by module
  const byModule = new Map<string, TaskSpecDraft[]>();
  for (const d of drafts) {
    const group = byModule.get(d.moduleId) ?? [];
    group.push(d);
    byModule.set(d.moduleId, group);
  }

  // Within each module: enforce layer ordering
  for (const [, moduleDrafts] of byModule) {
    const sorted = [...moduleDrafts].sort(
      (a, b) => (LAYER_ORDER[a.engineeringLayer] ?? 3) - (LAYER_ORDER[b.engineeringLayer] ?? 3),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if ((LAYER_ORDER[prev.engineeringLayer] ?? 3) < (LAYER_ORDER[curr.engineeringLayer] ?? 3)) {
        edges.push({
          fromTaskDraftId: prev.id,
          toTaskDraftId: curr.id,
          reason: `${prev.engineeringLayer} → ${curr.engineeringLayer} (layer order within ${prev.moduleId})`,
        });
      }
    }
  }

  // Cross-module: if a draft's goal references another module, add edge
  const moduleNames = [...byModule.keys()];
  for (const d of drafts) {
    for (const modName of moduleNames) {
      if (modName === d.moduleId) continue;
      if (d.goal.includes(modName) || d.allowedRepoPaths.some((p) => p.includes(modName.toLowerCase()))) {
        // Find the earliest draft in that module
        const depDrafts = byModule.get(modName);
        if (depDrafts && depDrafts.length > 0) {
          const earliest = depDrafts.reduce((a, b) =>
            (LAYER_ORDER[a.engineeringLayer] ?? 3) <= (LAYER_ORDER[b.engineeringLayer] ?? 3) ? a : b,
          );
          // Only add if not already present
          if (!edges.some((e) => e.fromTaskDraftId === earliest.id && e.toTaskDraftId === d.id)) {
            edges.push({
              fromTaskDraftId: earliest.id,
              toTaskDraftId: d.id,
              reason: `Cross-module dependency: ${d.moduleId} depends on ${modName}`,
            });
          }
        }
      }
    }
  }

  return edges;
}

// ── Cycle detection (Kahn's) ──

function detectCycles(drafts: TaskSpecDraft[], edges: ExecutionEdge[]): string[] {
  const ids = new Set(drafts.map((d) => d.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of ids) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (ids.has(e.fromTaskDraftId) && ids.has(e.toTaskDraftId)) {
      adj.get(e.fromTaskDraftId)!.push(e.toTaskDraftId);
      inDegree.set(e.toTaskDraftId, (inDegree.get(e.toTaskDraftId) ?? 0) + 1);
    }
  }

  const queue = [...ids].filter((id) => (inDegree.get(id) ?? 0) === 0);
  const visited = new Set<string>();
  while (queue.length > 0) {
    const node = queue.shift()!;
    visited.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  return [...ids].filter((id) => !visited.has(id));
}

// ── Topological batching ──

function topologicalBatch(
  drafts: TaskSpecDraft[],
  edges: ExecutionEdge[],
  cycleNodes: string[],
): ExecutionBatch[] {
  const ids = new Set(drafts.map((d) => d.id));
  const cycleSet = new Set(cycleNodes);
  const nonCycleIds = [...ids].filter((id) => !cycleSet.has(id));

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nonCycleIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (nonCycleIds.includes(e.fromTaskDraftId) && nonCycleIds.includes(e.toTaskDraftId)) {
      adj.get(e.fromTaskDraftId)!.push(e.toTaskDraftId);
      inDegree.set(e.toTaskDraftId, (inDegree.get(e.toTaskDraftId) ?? 0) + 1);
    }
  }

  const batches: ExecutionBatch[] = [];
  const visited = new Set<string>();
  let batchNum = 1;

  while (visited.size < nonCycleIds.length) {
    const ready = nonCycleIds.filter(
      (id) => !visited.has(id) && (inDegree.get(id) ?? 0) === 0,
    );
    if (ready.length === 0) break;

    batches.push({
      batchNumber: batchNum,
      taskDraftIds: ready,
      rationale: ready.length > 1
        ? `${ready.length} independent specs — safe to execute in parallel.`
        : "Sequential — depends on prior batch.",
    });

    for (const id of ready) {
      visited.add(id);
      for (const neighbor of adj.get(id) ?? []) {
        inDegree.set(neighbor, Math.max((inDegree.get(neighbor) ?? 1) - 1, 0));
      }
    }
    batchNum++;
  }

  // Append cycle nodes as final sequential batches
  if (cycleNodes.length > 0) {
    batches.push({
      batchNumber: batchNum,
      taskDraftIds: cycleNodes,
      rationale: "Cycle detected — forced sequential execution. Review dependencies.",
    });
  }

  return batches;
}

// ── Unsafe parallelism detection ──

function findUnsafeParallel(batchDrafts: TaskSpecDraft[]): [TaskSpecDraft, TaskSpecDraft][] {
  const pairs: [TaskSpecDraft, TaskSpecDraft][] = [];
  for (let i = 0; i < batchDrafts.length; i++) {
    for (let j = i + 1; j < batchDrafts.length; j++) {
      const a = batchDrafts[i];
      const b = batchDrafts[j];
      // Same module + same layer = unsafe
      if (a.moduleId === b.moduleId && a.engineeringLayer === b.engineeringLayer) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

// ── Critical path (longest path through DAG by complexity) ──

function computeCriticalPath(
  drafts: TaskSpecDraft[],
  edges: ExecutionEdge[],
  batches: ExecutionBatch[],
): string[] {
  const draftMap = new Map(drafts.map((d) => [d.id, d]));
  const adj = new Map<string, string[]>();
  const ids = drafts.map((d) => d.id);

  for (const id of ids) adj.set(id, []);
  for (const e of edges) {
    if (adj.has(e.fromTaskDraftId)) {
      adj.get(e.fromTaskDraftId)!.push(e.toTaskDraftId);
    }
  }

  // DP: longest path by cumulative complexity
  const dist = new Map<string, number>();
  const parent = new Map<string, string | null>();

  // Process in batch order
  for (const batch of batches) {
    for (const id of batch.taskDraftIds) {
      const d = draftMap.get(id);
      const selfCost = d?.complexityScore ?? 1;
      if (!dist.has(id)) {
        dist.set(id, selfCost);
        parent.set(id, null);
      }
      for (const neighbor of adj.get(id) ?? []) {
        const nCost = (draftMap.get(neighbor)?.complexityScore ?? 1);
        const newDist = (dist.get(id) ?? 0) + nCost;
        if (newDist > (dist.get(neighbor) ?? 0)) {
          dist.set(neighbor, newDist);
          parent.set(neighbor, id);
        }
      }
    }
  }

  // Find the node with maximum distance
  let maxId = ids[0];
  let maxDist = 0;
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      maxId = id;
    }
  }

  // Trace back
  const path: string[] = [];
  let cur: string | null = maxId;
  while (cur) {
    path.unshift(cur);
    cur = parent.get(cur) ?? null;
  }

  return path;
}
