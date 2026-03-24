---
layer: core
criticality: critical
enabled_in_production: yes
---

# 31 — Sandbox & Execution Isolation

> Layer 1 — Core Engine
>
> **Always active.** All run execution must happen inside isolated Docker containers.

## 1 — Purpose

Ensures that AI-generated code and model execution never run on the host process. Every Run's code execution is sandboxed inside a Docker container with deterministic resource limits, network isolation, and filesystem constraints.

---

## 2 — Architecture Constraints

| Constraint | Value |
|-----------|-------|
| Execution target | Docker container only |
| Host-level execution | **Forbidden** |
| Privileged containers | **Forbidden** |
| Docker socket mount | **Forbidden** |
| Arbitrary host mounts | **Forbidden** |
| Root inside container | **Forbidden** (non-root user: 1000:1000) |
| Deploy target | Single VPS |
| Orchestration cluster | None (no Kubernetes) |

---

## 3 — Sandbox Policy Model

Each Run references a `sandbox_policy` that defines its execution constraints.

### sandbox_policies table

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| id | uuid | auto | Primary key |
| name | text | — | Human-readable policy name |
| cpu_limit | numeric | 1.0 | Docker `--cpus` value |
| memory_limit_mb | integer | 512 | Docker `--memory` in MB |
| timeout_seconds | integer | 300 | Hard kill timeout |
| allowed_network | boolean | false | Whether outbound network is allowed |
| allowed_ports_json | jsonb | [] | Allowed port list (if network enabled) |
| read_only_root | boolean | true | Docker `--read-only` flag |
| allowed_paths_json | jsonb | [] | Additional read-only mount paths |

### Default Policies

| Name | CPU | Memory | Timeout | Network | Root FS |
|------|-----|--------|---------|---------|---------|
| default | 1.0 | 512 MB | 5 min | none | read-only |
| network-allowed | 2.0 | 1024 MB | 10 min | allowed | read-only |
| heavy-compute | 4.0 | 2048 MB | 15 min | none | read-write |

---

## 4 — Docker Execution Model

### Container Launch

```bash
docker run --rm \
  --cpus=1.0 \
  --memory=512m \
  --security-opt=no-new-privileges:true \
  --user=1000:1000 \
  --read-only \
  --tmpfs=/tmp:rw,noexec,nosuid,size=100m \
  --network=none \
  -v /var/ai-studio/workspaces/{workspace_id}:/workspace:rw \
  -w /workspace \
  --label=ai-studio.run-id={run_id} \
  --label=ai-studio.workspace-id={workspace_id} \
  --stop-timeout=300 \
  {docker_image} {command...}
```

### Timeout Wrapper

```bash
timeout --signal=KILL 300 docker run ...
```

If timeout fires → exit code 124 → run.error_class = "timeout".

---

## 5 — Workspace Safety

### Path Rules

All workspaces MUST be created under:
```
/var/ai-studio/workspaces/{workspace_id}
```

| Rule | Enforcement |
|------|-------------|
| Path must start with `/var/ai-studio/workspaces/` | `SandboxExecutorService.validateWorktreePath()` |
| Path must contain workspace ID | GuardError if mismatch |
| No access outside workspace | Docker volume mount restricts to workspace only |
| No path traversal | Normalized path checked against prefix |

### Volume Mounts

| Mount | Target | Mode |
|-------|--------|------|
| Workspace | `/workspace` | rw |
| Temp (if read-only root) | `/tmp` | rw, noexec, nosuid, 100MB |
| Allowed paths | `/mnt/{name}` | ro |

---

## 6 — Network Policy

### Default: No Network

```
--network=none
```

No outbound connections, no DNS, no internet access.

### When Network Allowed

Only when `sandbox_policy.allowed_network == true`:
- Container uses default bridge network
- Allowed ports defined in `allowed_ports_json`
- Still no privileged mode

---

## 7 — Heartbeat + Lease Integration

### During Execution

The external executor process updates heartbeat every 10 seconds:

```
SandboxExecutorService.updateHeartbeat(runId)
  → runs.heartbeat_at = now
  → runs.lease_expires_at = now + 10min
```

### If Process Crashes

1. Heartbeat stops updating
2. `heartbeat_at` becomes stale (> threshold)
3. StalledRunDetector marks run as stalled
4. Lease expires → run can be reclaimed
5. Container may still be running → cleanup required

### Container Cleanup

```bash
docker rm -f sandbox-{run_id_prefix}
```

---

## 8 — Timeout Enforcement

| Step | Action |
|------|--------|
| 1 | `timeout` utility wraps docker command |
| 2 | If `timeout_seconds` exceeded, SIGKILL sent |
| 3 | Exit code = 124 (timeout convention) |
| 4 | `run.error_class` = "timeout" |
| 5 | `run.exit_code` = 124 |
| 6 | Run transitions to `timed_out` state |

---

## 9 — Security Model

### What Is Allowed

- Read/write to `/workspace` (the run's workspace only)
- Write to `/tmp` (ephemeral, size-limited, noexec)
- Read-only access to explicitly allowed paths
- CPU and memory within policy limits

### What Is NOT Allowed

| Forbidden Action | Mechanism |
|-----------------|-----------|
| Host-level code execution | All execution inside Docker |
| Privileged mode | `--security-opt=no-new-privileges:true` |
| Docker socket access | No mount of `/var/run/docker.sock` |
| Root user | `--user=1000:1000` enforced |
| Arbitrary host mounts | Only workspace path mounted |
| Exec into running containers | No `docker exec` allowed |
| Network access (default) | `--network=none` |
| Writing to root filesystem | `--read-only` (default policy) |
| Executable temp files | `/tmp` mounted with `noexec` |

---

## 10 — Failure Modes

| Scenario | Response |
|----------|----------|
| Container timeout | SIGKILL, exit_code=124, run → timed_out |
| Out of memory (OOM) | Docker kills container, exit_code=137, run → failed |
| Container crash | Capture stderr, run → failed |
| Workspace path invalid | GuardError before execution |
| No sandbox policy | GuardError — default policy required |
| Heartbeat stops | StalledRunDetector flags, lease expires |
| Docker daemon down | Execution fails, run → failed, alert founder |

---

## 11 — Run ↔ Sandbox Traceability

```
Run
  ├── sandbox_policy_id → SandboxPolicy (resource limits)
  ├── exit_code → Container exit code
  ├── logs_ref → runs/{runId}/sandbox-logs
  ├── error_class → "timeout" | "oom" | ...
  └── RepoWorkspace
        └── worktree_path → /var/ai-studio/workspaces/{workspace_id}
```

Every execution is fully traceable from Run to container to logs.

---

## 12 — Secret Isolation in Sandbox

Sandbox containers follow the secret injection rules from `delivery/runtime-and-secret-governance.md`.

| Secret | Allowed in Sandbox | Mode |
|--------|:-----------------:|------|
| GitHub Token | ✅ | Read-only, repo-scoped |
| SSH Deploy Key | ❌ | Never |
| Registry Credentials | ❌ | Never |
| DNS Credentials | ❌ | Never |
| DB Connection String | ❌ | Never |
| LLM API Keys | ❌ | Never |
| Control Plane Secrets | ❌ | Never |

**Enforcement:** SandboxExecutorService validates environment variables before container launch. Any forbidden secret in the container environment triggers a GuardError.
