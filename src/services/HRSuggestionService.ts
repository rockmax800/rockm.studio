// PART 4 — HR Suggestion Engine
// Generates explainable suggestions based on employee metrics.
// PART 7 — Does NOT auto-fire, auto-hire, or change workload.

export interface HRSuggestion {
  employee_id: string;
  employee_name: string;
  suggestion_type: "replace" | "promote" | "probation";
  reason: string;
}

interface EmployeeWithMetrics {
  id: string;
  name: string;
  success_rate: number;
  avg_cost: number;
  avg_latency: number;
  bug_rate: number;
  escalation_rate: number;
  reputation_score: number;
}

/**
 * Generate HR suggestions based on employee performance metrics.
 * All suggestions are explainable — each includes the specific metric trigger.
 */
export function generateHRSuggestions(employees: EmployeeWithMetrics[]): HRSuggestion[] {
  const suggestions: HRSuggestion[] = [];

  for (const emp of employees) {
    // Replacement candidates
    const replaceReasons: string[] = [];
    if (emp.success_rate < 0.6) {
      replaceReasons.push(`success rate ${(emp.success_rate * 100).toFixed(1)}% (threshold: 60%)`);
    }
    if (emp.bug_rate > 0.3) {
      replaceReasons.push(`bug rate ${(emp.bug_rate * 100).toFixed(1)}% (threshold: 30%)`);
    }
    if (emp.escalation_rate > 0.2) {
      replaceReasons.push(`escalation rate ${(emp.escalation_rate * 100).toFixed(1)}% (threshold: 20%)`);
    }

    if (replaceReasons.length > 0) {
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        suggestion_type: "replace",
        reason: `Consider replacing ${emp.name}: ${replaceReasons.join("; ")}`,
      });
      continue; // Don't also suggest promote for same employee
    }

    // Promotion candidates
    if (
      emp.success_rate > 0.9 &&
      emp.avg_cost < 0.05 &&
      emp.avg_latency < 5000
    ) {
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        suggestion_type: "promote",
        reason: `Promote ${emp.name} to handle more load: ${(emp.success_rate * 100).toFixed(1)}% success, $${emp.avg_cost.toFixed(3)} avg cost, ${emp.avg_latency}ms avg latency`,
      });
    }

    // Probation candidates (borderline)
    if (
      emp.success_rate >= 0.6 && emp.success_rate < 0.75 &&
      emp.reputation_score < 0.3
    ) {
      suggestions.push({
        employee_id: emp.id,
        employee_name: emp.name,
        suggestion_type: "probation",
        reason: `Put ${emp.name} on probation: reputation score ${emp.reputation_score.toFixed(3)}, success rate ${(emp.success_rate * 100).toFixed(1)}%`,
      });
    }
  }

  return suggestions;
}
