# AI Production Studio — Design System Contract v1.0

## 1. Grid System (Brockmann Principles)

| Property | Value |
|---|---|
| Grid columns | 12 |
| Max container width | 1440px |
| Max content width | 1280px |
| Sidebar fixed width | 280px |
| Base spacing unit | 4px |
| Spacing rhythm | 4, 8, 12, 16, 24, 32, 48, 64 |

**Rules:**
- All elements align to grid columns
- No arbitrary padding — use spacing scale only
- Whitespace is structural, not decorative
- Use `grid-container` / `grid-content` utility classes

## 2. Color System

### Primary Accent: Deep Emerald `#0E7C66` (HSL 163 79% 27%)

### Dark Theme (Default)

| Token | HSL | Hex |
|---|---|---|
| `--background` | 225 20% 7% | #0F1115 |
| `--card` | 225 18% 11% | #151922 |
| `--secondary` | 225 16% 15% | #1B2130 |
| `--surface-glass` | 225 16% 15% | #222938 |
| `--foreground` | 220 13% 91% | #E5E7EB |
| `--muted-foreground` | 220 9% 46% | #6B7280 |

### Light Theme

| Token | HSL | Hex |
|---|---|---|
| `--background` | 225 14% 97% | #F7F8FA |
| `--card` | 0 0% 100% | #FFFFFF |
| `--secondary` | 225 14% 96% | #F1F3F6 |
| `--muted` | 225 14% 93% | #E9ECF2 |
| `--foreground` | 224 71% 4% | #111827 |
| `--muted-foreground` | 218 11% 35% | #4B5563 |

### Lifecycle States

| State | Token | Hex |
|---|---|---|
| Ready | `--lifecycle-ready` | #2F6FED |
| In Progress | `--lifecycle-in-progress` | #F5A524 |
| Review | `--lifecycle-review` | #8E44AD |
| Rework | `--lifecycle-rework` | #E67E22 |
| Blocked | `--lifecycle-blocked` | #E53935 |
| Escalated | `--lifecycle-escalated` | #C2185B |
| Validated | `--lifecycle-validated` | #16A085 |
| Done | `--lifecycle-done` | #2ECC71 |
| Deploying | `--lifecycle-deploying` | #5E35B1 |
| Failed | `--lifecycle-failed` | #D32F2F |

**Rules:**
- No pure black (#000) or pure white (#FFF) in surfaces
- No neon / electric colors
- Status colors encode meaning, never decoration

## 3. Typography System

| Level | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|
| Display | 42px | 600 | 110% | -0.02em |
| Page Title | 28px | 600 | 120% | -0.015em |
| Section Title | 18px | 600 | 120% | — |
| Card Title | 15px | 600 | 130% | — |
| Body | 14px | 400 | 150% | — |
| Meta | 13px | 400 | 150% | — |
| Label | 12px | 500 | 130% | — |
| Micro | 11px | 500 | 130% | — |

**Font:** Inter (with OpenType features cv02, cv03, cv04, cv11)
**Mono:** JetBrains Mono

**Rules:**
- No tiny uppercase-only labels as primary content
- No excessive letter-spacing (>0.05em)
- No thin gray-on-gray text — minimum contrast: muted-foreground on background

## 4. Component Language

### Cards
- Border radius: 16px (`rounded-card`)
- Shadow: `shadow-card` (subtle), `shadow-elevated` on hover
- No heavy borders — use `border-border` (subtle) only
- Clear internal hierarchy: title → meta → content → actions

### Buttons
- **Primary:** Solid emerald, white text, hover elevation
- **Secondary:** Surface bg, clear border, foreground text
- **Danger:** Destructive color, white text
- **Ghost:** Transparent, muted text, hover surface

### Badges
- Pill shape (`rounded-full`)
- Solid background at 15% opacity + text color
- Font: 11px semibold
- Used for status only

### Chips
- Compact inline elements
- Color-coded per event type
- Used in event streams and metadata

## 5. Motion System

| Property | Value |
|---|---|
| Duration | 180–250ms |
| Easing | ease-out |
| Transition classes | `duration-180`, `duration-220`, `duration-250` |

| Animation | Usage | Duration |
|---|---|---|
| `animate-fade-in` | New list items, event entries | 220ms |
| `animate-slide-up` | Panel reveals | 220ms |
| `animate-run-pulse` | Active run indicator | 1.5s loop |
| `animate-deploy-shimmer` | Deploy in progress | 2s loop |
| `animate-glow` | Primary action glow | 2s loop |

**Rules:**
- No bounce or elastic easing
- No attention-grabbing motion
- Hover effects: translate or shadow only, no scale > 1.02

## 6. Shadows

| Token | Usage |
|---|---|
| `shadow-card` | Default card elevation |
| `shadow-elevated` | Hover state, active panels |
| `shadow-glow` | Primary action emphasis |

## 7. Density Rules

- High information density: operational tool, not marketing page
- No giant empty rectangles
- No centered lonely text blocks
- No decorative whitespace > 64px between content blocks
- Empty states: concise message + action, no illustrations

## 8. Usage Rules

1. **Always use semantic tokens** — never hardcode hex/HSL in components
2. **Always use spacing scale** — no arbitrary px values
3. **Cards use `rounded-card`** (16px), controls use `rounded-lg` (8px)
4. **Status colors encode state** — never use lifecycle colors for decoration
5. **Typography hierarchy is mandatory** — use `text-display` through `text-micro` classes
6. **Dark theme is default** — light theme via `.light` class on root
7. **All motion uses ease-out** — no other easing curves
8. **Sidebar is 280px fixed** — content fills remaining width
