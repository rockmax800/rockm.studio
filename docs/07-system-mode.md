---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
---

# 07 — System Mode

> Cross-cutting — applies to all layers

## 1 — Purpose

Defines the dual-mode system: **Production** (default) and **Experimental**.
Controls which modules are active at runtime.

---

## 2 — Modes

| Mode | Default | Layer 1 | Layer 2 | Layer 3 | Token Risk |
|------|---------|---------|---------|---------|------------|
| **Production** | ✅ Yes | ✅ | ❌ | ❌ | Low |
| **Experimental** | No | ✅ | ✅ | ✅ | High |

**Production is always the default.** System starts in production mode.
Mode persists in `system_settings` table — survives restarts.

---

## 3 — system_settings Table

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| id | uuid | auto | PK |
| mode | text | "production" | "production" or "experimental" |
| experimental_features | jsonb | all false | See §4 |
| updated_at | timestamp | now() | |

---

## 4 — Feature Flags

See `08-feature-flags.md` for full flag definitions.

In production mode, ALL experimental feature flags are forced to `false` regardless of stored values.

---

## 5 — Mode Switch

- **Endpoint:** `POST /api/system/mode`
- **Actor:** Founder only
- **Logged:** ActivityEvent `system.mode_changed`
- **Cache:** `SystemModeService` caches for 30s, invalidated on switch
- **Safety:** Switching to production forces all experimental features off

---

## 6 — Implementation

- **Service:** `src/services/SystemModeService.ts`
- **Hook:** `src/hooks/use-system-mode.ts`
- **API:** `app/api/system/mode/route.ts`

---

## 7 — Operating Modes (Extended)

For detailed operating modes (Minimal Stable, Lean Autonomous, Company, Experimental), see `27-operating-modes.md`.

System mode (`production`/`experimental`) is the runtime control.
Operating modes are conceptual configurations that map to system mode + feature flags.
