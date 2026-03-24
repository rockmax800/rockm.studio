// Role Contract Enforcement Service
// Validates that agent execution stays within role boundaries.
// No lifecycle changes — enforcement only.

import { GuardError } from "@/guards/GuardError";
import { logInfo } from "@/lib/logger";

interface PrismaLike {
  [key: string]: any;
}

export interface RoleContract {
  id: string;
  role_code: string;
  allowed_repo_paths_json: string[];
  forbidden_repo_paths_json: string[];
  allowed_task_domains_json: string[];
  required_artifacts_json: string[];
  required_verification_steps_json: string[];
  risk_threshold: number;
  may_deploy: boolean;
  may_merge: boolean;
  may_modify_schema: boolean;
}

export interface TaskSpec {
  id: string;
  task_id: string;
  goal: string;
  target_repository: string | null;
  allowed_repo_paths_json: string[];
  forbidden_repo_paths_json: string[];
  acceptance_criteria_json: unknown[];
  verification_plan_json: unknown[];
  risk_class: string;
  requested_outcome: string | null;
  required_artifacts_json: string[];
  definition_of_done_json: unknown[];
}

export interface PathValidationResult {
  valid: boolean;
  violations: string[];
  checkedPaths: string[];
}

export class RoleContractEnforcementService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Load the role contract for a given agent role.
   * Returns null if no contract is linked.
   */
  async loadContract(roleId: string): Promise<RoleContract | null> {
    const role = await this.prisma.agent_roles.findUnique({
      where: { id: roleId },
    });
    if (!role?.role_contract_id) return null;

    const contract = await this.prisma.role_contracts.findUnique({
      where: { id: role.role_contract_id },
    });
    return contract ?? null;
  }

  /**
   * Load the TaskSpec for a given task.
   * Returns null if no spec exists.
   */
  async loadTaskSpec(taskId: string): Promise<TaskSpec | null> {
    const spec = await this.prisma.task_specs.findFirst({
      where: { task_id: taskId },
    });
    return spec ?? null;
  }

  /**
   * Validate that a set of file paths are within allowed boundaries.
   * Checks both role contract and task spec constraints.
   */
  validatePaths(
    changedPaths: string[],
    contract: RoleContract | null,
    taskSpec: TaskSpec | null,
  ): PathValidationResult {
    const violations: string[] = [];

    for (const filePath of changedPaths) {
      // Check role contract forbidden paths
      if (contract) {
        const forbidden = contract.forbidden_repo_paths_json ?? [];
        for (const pattern of forbidden) {
          if (this.pathMatches(filePath, pattern)) {
            violations.push(
              `Path "${filePath}" is forbidden by role contract (pattern: "${pattern}")`,
            );
          }
        }

        // Check allowed paths — if specified, path must match at least one
        const allowed = contract.allowed_repo_paths_json ?? [];
        if (allowed.length > 0) {
          const matchesAny = allowed.some((pattern) =>
            this.pathMatches(filePath, pattern),
          );
          if (!matchesAny) {
            violations.push(
              `Path "${filePath}" is not in role contract allowed paths`,
            );
          }
        }
      }

      // Check task spec forbidden paths
      if (taskSpec) {
        const forbidden = taskSpec.forbidden_repo_paths_json ?? [];
        for (const pattern of forbidden) {
          if (this.pathMatches(filePath, pattern)) {
            violations.push(
              `Path "${filePath}" is forbidden by task spec (pattern: "${pattern}")`,
            );
          }
        }

        const allowed = taskSpec.allowed_repo_paths_json ?? [];
        if (allowed.length > 0) {
          const matchesAny = allowed.some((pattern) =>
            this.pathMatches(filePath, pattern),
          );
          if (!matchesAny) {
            violations.push(
              `Path "${filePath}" is not in task spec allowed paths`,
            );
          }
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      checkedPaths: changedPaths,
    };
  }

  /**
   * Validate that a task domain is allowed by the role contract.
   */
  validateTaskDomain(
    domain: string,
    contract: RoleContract,
  ): { valid: boolean; reason?: string } {
    const allowed = contract.allowed_task_domains_json ?? [];
    if (allowed.length === 0) return { valid: true };

    if (!allowed.includes(domain)) {
      return {
        valid: false,
        reason: `Domain "${domain}" is not allowed for role "${contract.role_code}". Allowed: ${allowed.join(", ")}`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate that all required artifacts are present for a task.
   */
  async validateRequiredArtifacts(
    taskId: string,
    contract: RoleContract | null,
    taskSpec: TaskSpec | null,
  ): Promise<{ valid: boolean; missing: string[] }> {
    const requiredCategories: string[] = [];
    if (contract?.required_artifacts_json) {
      requiredCategories.push(...contract.required_artifacts_json);
    }
    if (taskSpec?.required_artifacts_json) {
      requiredCategories.push(...taskSpec.required_artifacts_json);
    }

    if (requiredCategories.length === 0) return { valid: true, missing: [] };

    const artifacts = await this.prisma.artifacts.findMany({
      where: { task_id: taskId },
      select: { artifact_category: true, artifact_type: true },
    });

    const presentCategories = new Set(
      artifacts
        .map((a: any) => a.artifact_category ?? a.artifact_type)
        .filter(Boolean),
    );

    const missing = requiredCategories.filter(
      (cat) => !presentCategories.has(cat),
    );

    return { valid: missing.length === 0, missing };
  }

  /**
   * Validate deployment permission for a role.
   */
  validateDeployPermission(contract: RoleContract): {
    valid: boolean;
    reason?: string;
  } {
    if (!contract.may_deploy) {
      return {
        valid: false,
        reason: `Role "${contract.role_code}" does not have deploy permission`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate merge permission for a role.
   */
  validateMergePermission(contract: RoleContract): {
    valid: boolean;
    reason?: string;
  } {
    if (!contract.may_merge) {
      return {
        valid: false,
        reason: `Role "${contract.role_code}" does not have merge permission`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate schema modification permission for a role.
   */
  validateSchemaPermission(contract: RoleContract): {
    valid: boolean;
    reason?: string;
  } {
    if (!contract.may_modify_schema) {
      return {
        valid: false,
        reason: `Role "${contract.role_code}" does not have schema modification permission`,
      };
    }
    return { valid: true };
  }

  /**
   * Full pre-execution validation: domain + paths + permissions.
   * Throws GuardError if any check fails.
   */
  async enforcePreExecution(params: {
    runId: string;
    roleId: string;
    taskId: string;
    taskDomain: string;
  }): Promise<{
    contract: RoleContract | null;
    taskSpec: TaskSpec | null;
  }> {
    const contract = await this.loadContract(params.roleId);
    const taskSpec = await this.loadTaskSpec(params.taskId);

    // Validate task domain against role contract
    if (contract) {
      const domainCheck = this.validateTaskDomain(
        params.taskDomain,
        contract,
      );
      if (!domainCheck.valid) {
        throw new GuardError({
          message: domainCheck.reason!,
          entityType: "run",
          entityId: params.runId,
          fromState: "preparing",
          toState: "running",
        });
      }
    }

    logInfo("role_contract_pre_execution_validated", {
      runId: params.runId,
      roleCode: contract?.role_code ?? "no_contract",
      hasTaskSpec: !!taskSpec,
    });

    return { contract, taskSpec };
  }

  /**
   * Post-execution validation: check changed files against boundaries.
   * Returns violations but does NOT throw — caller decides enforcement.
   */
  validateChangedFiles(
    changedFiles: string[],
    contract: RoleContract | null,
    taskSpec: TaskSpec | null,
  ): PathValidationResult {
    if (changedFiles.length === 0) {
      return { valid: true, violations: [], checkedPaths: [] };
    }

    const result = this.validatePaths(changedFiles, contract, taskSpec);

    if (!result.valid) {
      logInfo("role_contract_path_violations", {
        violations: result.violations,
        checkedPaths: result.checkedPaths,
      });
    }

    return result;
  }

  /**
   * Simple glob-like path matching.
   * Supports: "src/components/*", "prisma/**", "*.ts"
   */
  private pathMatches(filePath: string, pattern: string): boolean {
    if (pattern === filePath) return true;

    // Convert glob to regex
    const regexStr = pattern
      .replace(/\*\*/g, "___DOUBLESTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___DOUBLESTAR___/g, ".*")
      .replace(/\./g, "\\.");

    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(filePath);
  }
}
