# AI Employee Avatar Generation Guideline

## 1. Core Aesthetic

| Property | Rule |
|---|---|
| Style | Semi-realistic digital portrait |
| Tone | Professional, modern tech industry |
| Background | Neutral gray (#E5E5E5 – #D4D4D4), studio-lit |
| Detail level | Clean, not over-rendered — no pores, no photorealism |
| Lighting | Soft studio, single key light + subtle fill |
| Expression | Calm, confident, approachable — never smiling wide |
| Clothing | Minimal, modern — turtlenecks, blazers, crew necks |
| Year feel | 2026 corporate tech aesthetic |

## 2. Absolute Rules

- **NO** cartoon, anime, chibi, or illustration style
- **NO** exaggerated features or caricature
- **NO** busy backgrounds, gradients, or environmental context
- **NO** accessories beyond glasses (no headphones, jewelry, hats)
- **NO** text, logos, or watermarks
- **NO** identical face structures across roles — each must be visually distinct
- **NO** overly detailed skin texture — keep it clean and slightly stylized

## 3. Prompt Template

```
Professional headshot portrait of a [age] [ethnicity] [gender] with [hair description],
[expression] expression, wearing [clothing], studio lighting, neutral gray background,
clean professional corporate photography style, semi-realistic digital art, high quality
```

### Parameter Rules

| Parameter | Guidelines |
|---|---|
| Age | Vary across roles: young (25-30), mid (30-40), mature (40-50) |
| Ethnicity | Diverse representation — no two adjacent roles share ethnicity |
| Gender | Balanced mix across the team |
| Hair | Distinct per role — short, long, curly, straight, styled, natural |
| Expression | Role-appropriate — see Section 4 |
| Clothing | Role-coded — see Section 4 |

## 4. Role-Based Visual Differentiation

### Product Strategist
- **Vibe**: Thoughtful, visionary
- **Expression**: Warm but focused, slight head tilt
- **Clothing**: Structured charcoal blazer
- **Hair**: Natural, pulled back or styled
- **Accent**: Amber/gold ring color
- **Signature**: "The one who sees the whole board"

### Solution Architect
- **Vibe**: Calm, analytical
- **Expression**: Precise, composed
- **Clothing**: Light gray crew neck
- **Hair**: Clean, styled modern cut
- **Accent**: Cyan ring color
- **Signature**: "The one who draws the blueprint"

### Backend Architect
- **Vibe**: Deep thinker, technical authority
- **Expression**: Serious, focused
- **Clothing**: Dark navy blazer over light shirt
- **Hair**: Short, neat — beard acceptable
- **Accent**: Indigo ring color
- **Signature**: "The one who builds foundations"

### Backend Implementer
- **Vibe**: Precise, hands-on builder
- **Expression**: Analytical, intent
- **Clothing**: Dark mock turtleneck
- **Hair**: Modern styled cut
- **Accent**: Violet ring color
- **Signature**: "The one who writes the engine"

### Frontend Builder
- **Vibe**: Creative, detail-oriented
- **Expression**: Confident, approachable
- **Clothing**: Dark turtleneck sweater
- **Hair**: Short or medium, possibly glasses
- **Accent**: Blue ring color
- **Signature**: "The one who shapes pixels"

### Reviewer
- **Vibe**: Thorough, quality-focused
- **Expression**: Thoughtful, evaluative
- **Clothing**: Round glasses, dark henley
- **Hair**: Dark, neat — beard accepted
- **Accent**: Emerald ring color
- **Signature**: "The one who finds the flaw"

### QA Agent
- **Vibe**: Sharp, methodical
- **Expression**: Determined, alert
- **Clothing**: Minimalist white blouse or clean shirt
- **Hair**: Long or medium, pulled precise
- **Accent**: Rose ring color
- **Signature**: "The one who breaks to verify"

### Release Coordinator
- **Vibe**: Calm under pressure, structured
- **Expression**: Confident, warm smile (subtle)
- **Clothing**: Dark olive bomber or casual blazer
- **Hair**: Wavy or textured
- **Accent**: Orange ring color
- **Signature**: "The one who ships"

## 5. Visual Differentiation Matrix

| Role | Palette Temp | Clothing Tone | Age Band | Glasses | Facial Hair |
|---|---|---|---|---|---|
| Product Strategist | Warm | Dark structured | 28-35 | No | No |
| Solution Architect | Cool | Light minimal | 26-32 | No | No |
| Backend Architect | Neutral-dark | Navy formal | 35-45 | No | Yes (trimmed) |
| Backend Implementer | Cool | Dark minimal | 25-32 | No | No |
| Frontend Builder | Cool | Dark casual | 25-30 | Yes (modern) | No |
| Reviewer | Warm-neutral | Dark casual | 35-45 | Yes (round) | Yes (neat) |
| QA Agent | Neutral | White/light | 25-32 | No | No |
| Release Coordinator | Warm | Olive/earth | 28-35 | No | No |

## 6. Technical Specs

| Property | Value |
|---|---|
| Resolution | 512×512 px minimum |
| Format | JPEG (no transparency needed) |
| Model tier | `standard` (not fast — need detail fidelity) |
| File naming | `avatar-{role-slug}.jpg` |
| Storage | `src/assets/avatars/` |

## 7. UI Integration Rules

- Avatar displayed with role-colored ring (`ring-2` + `ring-offset-2`)
- Ring color matches role accent from design system
- Status dot overlaid at bottom-right corner
- Rounded corners: `rounded-xl` (cards) or `rounded-2xl` (profile header)
- Sizes: 48px (card), 80px (profile), 24px (inline mention)

## 8. Quality Checklist

Before accepting a generated avatar:

- [ ] Face is clearly visible and centered
- [ ] Background is neutral gray, no distractions
- [ ] Clothing matches role spec
- [ ] Expression is professional, not exaggerated
- [ ] No artifacts, distortions, or extra limbs
- [ ] Visually distinct from other role avatars
- [ ] Works well at 48px (card size) — face still readable
- [ ] Fits light UI without visual heaviness
