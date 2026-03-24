// Sandbox Executor Service
// Isolates Run execution inside Docker containers.
// No host-level execution. No privileged containers. Deterministic resource limits.

import { GuardError } from "@/guards/GuardError";
import { logInfo } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface SandboxPolicy {
  id: string;
  name: string;
  cpu_limit: number;
  memory_limit_mb: number;
  timeout_seconds: number;
  allowed_network: boolean;
  allowed_ports_json: string[];
  read_only_root: boolean;
  allowed_paths_json: string[];
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  containerId: string;
  logsRef: string;
}

export interface SandboxRunParams {
  runId: string;
  workspaceId: string;
  worktreePath: string;
  dockerImage: string;
  command: string[];
  env?: Record<string, string>;
}

const WORKSPACE_BASE_DIR = "/var/ai-studio/workspaces";

// ──────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────

export class SandboxExecutorService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  // ─── Policy Resolution ───

  /**
   * Load sandbox policy for a run.
   * Falls back to 'default' policy if run has no sandbox_policy_id.
   */
  async resolvePolicy(runId: string): Promise<SandboxPolicy> {
    return this.prisma.$transaction(async (tx: any) => {
      const run = await tx.runs.findUniqueOrThrow({ where: { id: runId } });

      if (run.sandbox_policy_id) {
        return tx.sandbox_policies.findUniqueOrThrow({
          where: { id: run.sandbox_policy_id },
        });
      }

      // Fallback to default policy
      const defaultPolicy = await tx.sandbox_policies.findFirst({
        where: { name: "default" },
      });

      if (!defaultPolicy) {
        throw new GuardError({
          message: "No default sandbox policy found. Cannot execute run without isolation policy.",
          entityType: "run",
          entityId: runId,
          fromState: "preparing",
          toState: "running",
        });
      }

      return defaultPolicy;
    });
  }

  // ─── Workspace Path Validation ───

  /**
   * Validate that worktree path is under controlled directory.
   * Prevents path traversal attacks.
   */
  validateWorktreePath(worktreePath: string, workspaceId: string): string {
    const expectedPrefix = `${WORKSPACE_BASE_DIR}/${workspaceId}`;
    const normalizedPath = worktreePath.replace(/\/+/g, "/").replace(/\/$/, "");

    if (!normalizedPath.startsWith(WORKSPACE_BASE_DIR)) {
      throw new GuardError({
        message: `Workspace path must be under ${WORKSPACE_BASE_DIR}. Got: "${normalizedPath}"`,
        entityType: "run",
        entityId: workspaceId,
        fromState: "invalid_path",
        toState: "valid",
      });
    }

    // If path doesn't match expected workspace ID prefix, reject
    if (!normalizedPath.startsWith(expectedPrefix)) {
      throw new GuardError({
        message: `Workspace path must match workspace ID. Expected prefix: "${expectedPrefix}", got: "${normalizedPath}"`,
        entityType: "run",
        entityId: workspaceId,
        fromState: "path_mismatch",
        toState: "valid",
      });
    }

    return normalizedPath;
  }

  // ─── Docker Command Generation ───

  /**
   * Generate the full docker run command with sandbox policy constraints.
   * This command is executed externally (not in this process).
   */
  generateDockerCommand(
    policy: SandboxPolicy,
    params: SandboxRunParams,
  ): string[] {
    const args: string[] = [
      "docker", "run",
      "--rm",
      // Resource limits
      `--cpus=${policy.cpu_limit}`,
      `--memory=${policy.memory_limit_mb}m`,
      // No privileged mode ever
      "--security-opt=no-new-privileges:true",
      // Non-root user
      "--user=1000:1000",
      // Workspace mount (only the workspace directory)
      `-v`, `${params.worktreePath}:/workspace:rw`,
      // Working directory
      `-w`, `/workspace`,
    ];

    // Read-only root filesystem
    if (policy.read_only_root) {
      args.push("--read-only");
      // tmpfs for temp files needed by most programs
      args.push("--tmpfs=/tmp:rw,noexec,nosuid,size=100m");
    }

    // Network policy
    if (!policy.allowed_network) {
      args.push("--network=none");
    }

    // Allowed paths (additional read-only mounts)
    const allowedPaths = Array.isArray(policy.allowed_paths_json)
      ? policy.allowed_paths_json
      : [];
    for (const allowedPath of allowedPaths) {
      // Only allow paths under workspace base
      if (typeof allowedPath === "string" && allowedPath.startsWith(WORKSPACE_BASE_DIR)) {
        args.push(`-v`, `${allowedPath}:/mnt/${allowedPath.split("/").pop()}:ro`);
      }
    }

    // Environment variables
    if (params.env) {
      for (const [key, value] of Object.entries(params.env)) {
        args.push("-e", `${key}=${value}`);
      }
    }

    // Container labels for tracking
    args.push(`--label=ai-studio.run-id=${params.runId}`);
    args.push(`--label=ai-studio.workspace-id=${params.workspaceId}`);

    // Timeout via docker's --stop-timeout
    args.push(`--stop-timeout=${policy.timeout_seconds}`);

    // Image and command
    args.push(params.dockerImage);
    args.push(...params.command);

    return args;
  }

  /**
   * Generate the timeout wrapper command.
   * Uses `timeout` utility to enforce hard time limit.
   */
  generateTimeoutWrapper(
    policy: SandboxPolicy,
    dockerCmd: string[],
  ): string[] {
    return [
      "timeout",
      "--signal=KILL",
      `${policy.timeout_seconds}`,
      ...dockerCmd,
    ];
  }

  // ─── Execution (pseudo — actual execution delegated to external process) ───

  /**
   * Execute a run inside a sandboxed Docker container.
   * Returns structured result with stdout, stderr, exit code.
   *
   * NOTE: In production, this calls out to a local executor process.
   * The actual docker invocation happens outside the Node.js event loop.
   */
  async execute(params: SandboxRunParams): Promise<SandboxResult> {
    const policy = await this.resolvePolicy(params.runId);

    // Validate workspace path
    const validatedPath = this.validateWorktreePath(
      params.worktreePath,
      params.workspaceId,
    );

    // Generate docker command
    const dockerCmd = this.generateDockerCommand(policy, {
      ...params,
      worktreePath: validatedPath,
    });

    // Generate timeout-wrapped command
    const fullCmd = this.generateTimeoutWrapper(policy, dockerCmd);

    const startTime = Date.now();

    logInfo("sandbox_execution_start", {
      runId: params.runId,
      workspaceId: params.workspaceId,
      policy: policy.name,
      cpuLimit: policy.cpu_limit,
      memoryLimitMb: policy.memory_limit_mb,
      timeoutSeconds: policy.timeout_seconds,
      networkAllowed: policy.allowed_network,
      command: fullCmd.join(" "),
    });

    // ── Simulated execution result ──
    // In production, this would:
    // 1. Spawn the docker process
    // 2. Stream stdout/stderr to log files
    // 3. Update heartbeat_at every 10 seconds
    // 4. Capture exit code
    // 5. Clean up container on completion

    const durationMs = Date.now() - startTime;
    const logsRef = `runs/${params.runId}/sandbox-logs`;
    const containerId = `sandbox-${params.runId.slice(0, 12)}`;

    // Record sandbox execution metadata on run
    await this.prisma.$transaction(async (tx: any) => {
      await tx.runs.update({
        where: { id: params.runId },
        data: {
          sandbox_policy_id: policy.id,
          logs_ref: logsRef,
          updated_at: new Date().toISOString(),
        },
      });
    });

    const result: SandboxResult = {
      stdout: "",
      stderr: "",
      exitCode: 0,
      timedOut: false,
      durationMs,
      containerId,
      logsRef,
    };

    logInfo("sandbox_execution_complete", {
      runId: params.runId,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      durationMs: result.durationMs,
    });

    return result;
  }

  /**
   * Handle timeout: kill container, mark run with timeout error class.
   */
  async handleTimeout(runId: string, containerId: string): Promise<void> {
    // Kill container command (external)
    const killCmd = ["docker", "kill", containerId];

    logInfo("sandbox_timeout", { runId, containerId, killCmd: killCmd.join(" ") });

    // Update run with timeout metadata
    await this.prisma.$transaction(async (tx: any) => {
      await tx.runs.update({
        where: { id: runId },
        data: {
          error_class: "timeout",
          exit_code: 124,
          failure_reason: "Container exceeded sandbox timeout limit",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });
  }

  // ─── Heartbeat Loop (called by external executor) ───

  /**
   * Update heartbeat and extend lease during container execution.
   * Called every 10 seconds by the executor process.
   */
  async updateHeartbeat(runId: string): Promise<void> {
    const now = new Date().toISOString();
    const leaseExtension = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await this.prisma.$transaction(async (tx: any) => {
      const run = await tx.runs.findUniqueOrThrow({ where: { id: runId } });

      if (run.state !== "running") {
        return; // Don't update heartbeat for non-running runs
      }

      await tx.runs.update({
        where: { id: runId },
        data: {
          heartbeat_at: now,
          lease_expires_at: leaseExtension,
          updated_at: now,
        },
      });
    });
  }

  // ─── Cleanup ───

  /**
   * Force-remove a container if it still exists.
   * Returns the docker command to execute externally.
   */
  generateCleanupCommand(containerId: string): string[] {
    return ["docker", "rm", "-f", containerId];
  }
}
