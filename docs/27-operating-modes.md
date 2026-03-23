# 27 — Operating Modes

## 1 — Purpose

Defines four operating modes that control which system modules are active.

---

## 2 — Mode Definitions

### Mode 1: Minimal Stable Mode (MSOM)

**For:** Daily production work with minimal token usage.

| Layer | Status |
|-------|--------|
| Core Engine (01–08) | ✅ Enabled |
| Company Layer (10–18) | ❌ Disabled |
| Autonomy (20–26) | ❌ Disabled |

**Active modules:** Projects, Tasks, Runs, Artifacts, Reviews, Approvals, Guards, Orchestration, Providers, Activity Events.

**Token cost:** Lowest.

---

### Mode 2: Lean Autonomous Mode

**For:** Production work with basic team structure, no experiments.

| Layer | Status |
|-------|--------|
| Core Engine (01–08) | ✅ Enabled |
| Company: Teams, Employees, Load Balancer | ✅ Enabled |
| Company: Blog, Predictions, Office | ❌ Disabled |
| Autonomy (20–26) | ❌ Disabled |

**Token cost:** Low.

---

### Mode 3: Company Mode

**For:** Full company simulation with all organizational features.

| Layer | Status |
|-------|--------|
| Core Engine (01–08) | ✅ Enabled |
| Company Layer (10–18) | ✅ Enabled |
| Autonomy (20–26) | ❌ Disabled |

**Token cost:** Medium.

---

### Mode 4: Experimental Mode

**For:** Development and testing of autonomy features.

| Layer | Status |
|-------|--------|
| Core Engine (01–08) | ✅ Enabled |
| Company Layer (10–18) | ✅ Enabled |
| Autonomy (20–26) | ✅ Enabled |

**Token cost:** Highest. Not recommended for client projects.

---

## 3 — Mode Selection

Operating mode is determined by project-level settings:
- `autonomy_settings` controls Layer 3
- `company_mode_settings` controls Layer 2
- Layer 1 is always active

---

## 4 — Recommended Defaults

| Scenario | Mode |
|----------|------|
| Client project delivery | Minimal Stable |
| Internal project with team | Lean Autonomous |
| Full internal simulation | Company |
| R&D and testing | Experimental |
