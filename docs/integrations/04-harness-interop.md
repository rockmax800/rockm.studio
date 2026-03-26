# 04 — Harness Interoperability Layer

> Status: **Planned** · Owner: System layer · Last updated: 2025-01-20

## Purpose

This document defines the boundary between this product (the canonical control plane) and external execution harnesses that may run agent tasks in the future.

## Core Principle

**This app is the control plane. External harnesses are optional execution environments.**

No external harness may:

1. Own or modify project/task/review/approval state.
2. Bypass the canonical state machine or guard matrix.
3. Self-modify agent configuration without founder approval.
4. Import rules, hooks, or commands that circumvent the local manifest registry.

## Compatibility Targets

The system is designed to eventually interoperate with these harness categories:

### Claude-style Harness (AGENTS.md / tool-use pattern)

- **Pattern**: Single-agent with structured tool calls, AGENTS.md-driven rules.
- **Mapping**: AGENTS.md rules map to local `RuleManifest` entries. Tool calls map to `CommandManifest`.
- **Integration surface**: Adapter receives a context pack + task spec → returns artifacts.
- **Current status**: Not connected. Native engine handles execution.

### Codex-style Harness (sandbox + multi-step execution)

- **Pattern**: Sandboxed environment with file system access, iterative execution.
- **Mapping**: Sandbox boundaries map to role contract `allowed_repo_paths` / `forbidden_repo_paths`. Steps map to run state transitions.
- **Integration surface**: Adapter receives task + context → returns changed files + test results.
- **Current status**: Not connected. Native engine handles execution.

### Generic Tool-Driven Harness (OpenCode, Aider, etc.)

- **Pattern**: CLI-driven code generation tools with configurable model backends.
- **Mapping**: Model selection maps to `ExecutionPolicy.providerFamily` / `modelName`. Output maps to artifact submission.
- **Integration surface**: Adapter receives prompt + file context → returns diffs.
- **Current status**: Not connected.

## Adapter Contract

All external harnesses must conform to the `ExecutionEngineAdapter` interface:

```typescript
interface ExecutionEngineAdapter {
  createRun(taskId: string, context: ContextPack): Promise<ExternalExecutionRef>;
  getRunStatus(ref: ExternalExecutionRef): Promise<RunStatus>;
  cancelRun(ref: ExternalExecutionRef): Promise<void>;
}
```

The adapter is a one-way delegation: the app sends work out, the harness returns results. The app never cedes control of state.

## Compatibility Matrix

| Feature                | Native | Ruflo | Claude-style | Codex-style | Generic |
|------------------------|--------|-------|-------------|-------------|---------|
| Execution              | ✓      | ✓*    | Planned     | Planned     | Planned |
| State ownership        | App    | App   | App         | App         | App     |
| Rule enforcement       | Local  | Local | Local       | Local       | Local   |
| Artifact submission    | Direct | API   | Adapter     | Adapter     | Adapter |
| Founder approval flow  | ✓      | ✓     | ✓           | ✓           | ✓       |
| Manifest compatibility | Full   | Full  | Partial     | Partial     | Minimal |

*Ruflo = experimental, feature-gated.

## Invariants

1. This app remains the single source of truth for all entity state.
2. External harnesses receive context packs — they do not query the database directly.
3. All artifacts returned by external harnesses enter the standard review pipeline.
4. No harness may modify agent memory, skills, or guidance without founder approval.
5. The local manifest registry (rules, hooks, commands) always takes precedence over harness-native equivalents.

## Implementation Path

1. Current: Native engine only (production). Ruflo adapter exists but is experimental.
2. Next: Define adapter stubs for Claude-style and Codex-style harnesses.
3. Future: Allow founder to select harness per-task or per-project via execution policy override.
