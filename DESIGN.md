# Design

<!-- impeccable:design-schema 1 -->

## Visual World

PathPoint is an operational workforce platform: applicants, providers, and admins each run real workflows (discover → apply → review → verify). The interface is **Operate** first, with a **Persuade** public entry surface. The world is *quiet institutional software with a confident indigo spine*: calm slate surfaces, one strong brand hue, precise type, generous rhythm, and motion used only where it explains a state change.

The incumbent identity is preserved — indigo/slate, Tailwind, role-tinted surfaces. This document elevates the craft of that world; it does not replace it.

## Modes

- **Operate** — dashboard, directories, editors, admin, settings. Scanability and consistency outrank expression; brand lives in precise details.
- **Persuade** — public landing (`/`). Earn trust and a sign-in.
- **Read** — detail pages (application detail, company detail, job detail). Structure for comprehension.

## Color

- **Brand (indigo):** `brand.50–900`. Primary actions, active nav, focus, links.
- **Neutrals (slate):** page `slate-50`, surface `white`, borders `slate-200`, body `slate-700`, muted `slate-500`, ink `slate-900`.
- **Role tints** (identity, never the only signal): candidate `teal`, provider `blue`, admin `indigo` (brand).
- **Status:** success `emerald`, warning `amber`, danger `rose`, info `sky`. Status is always paired with an icon or label — never color alone.
- **Accent (user-selectable):** the interactive hue is a single curated token, `--accent-100/500/600/700`, resolved from a name (see `frontend/src/utils/theme.js`: `ACCENTS`, `DEFAULT_ACCENT`, `resolveAccent`, `accentToCssVars`). The accent drives primary buttons (`.ui-btn-primary`), focus rings, text selection, and the caret. It overrides brand for *interactive* surfaces only; the brand indigo remains the identity mark (logo, brand badges). Stored as a name, never a raw hex, so the palette stays curated and contrast-safe (the `600` fill clears 4.5:1 on white).
- Contrast floor: body ≥ 4.5:1, large/secondary-strong ≥ 3:1. Secondary text on tinted surfaces tints from the hue, not gray.

## Typography

- **Face:** `Inter` (UI), system stack fallback. Numerals: `tabular-nums` for all tabular data, currency, and counters.
- **Scale** (rem): display 2.25/3 (36/48px), h1 1.875 (30), h2 1.5 (24), h3 1.25 (20), h4 1.125 (18), body 0.875–1 (14–16), caption 0.75–0.8125 (12–13).
- **Weights:** 400 body, 500 UI labels, 600 headings/emphasis, 700 display only.
- **Tracking:** display/h1 `-0.025em` (floor `-0.04em`); body `0`; all-caps labels `+0.06em`.
- **Rules:** `text-balance` on headings, `text-pretty` on lead paragraphs, measure 65–75ch. More space above a heading than below.

## Space & Layout

- Page: `max-w-7xl`, gutter `px-4 / sm:px-6 / lg:px-8`, vertical rhythm in 4px steps.
- Group tightly, separate generously: related items `gap-2–3`, distinct groups `space-y-6–10`.
- Cards `rounded-xl` (12px) or `rounded-2xl` (16px); pills only for small controls/badges.
- Resting cards combine a hairline border with the softest shadow; prominent surfaces (modals, popovers, dragged cards) use a strong shadow and **no** border. Never combine a border with a heavy shadow (the ghost-card tell).

## Elevation

Single source of truth, slate-tinted:

| token | use |
|---|---|
| `shadow-xs` | inputs, chips |
| `shadow-sm` | resting cards |
| `shadow-card` | primary cards, table shells |
| `shadow-elevated` | popovers, dropdowns |
| `shadow-popover` | modals, command surfaces |

Shadows carry an offset and soft blur; no zero-offset halos.

## Motion

- One authored entrance per view (`fade-up`, 400–500ms, `cubic-bezier(0.22,1,0.36,1)`), from already-visible content.
- Interaction transitions 150–200ms `ease-out` on transform/opacity/color only.
- Every animation respects `prefers-reduced-motion` and `MotionConfig reducedMotion="user"`.

## Browser Surfaces (ship with the palette)

- Selection: brand-tinted background, white text.
- Caret: brand color.
- Scrollbars: thin, slate, rounded.
- Focus: `:focus-visible` ring — 2px brand, 2px offset.
- Underline offset on inline links; tabular numerals in data.

## Component Contracts

- **Button:** `primary` (brand, white text), `secondary` (white, border, slate text), `ghost` (transparent, slate), `danger` (rose). All have hover, active, disabled, focus, and a loading state with a spinner.
- **Input/Select/Textarea:** 1px `slate-300` border, `shadow-xs`, brand focus ring, visible error state (rose border + helper text naming the problem and recovery).
- **Badge:** status semantics with icon + label; neutral, brand, success, warning, danger, info.
- **Card:** border `slate-200`, `bg-white`, `shadow-sm` → `shadow-card` for primary.
- **Empty state:** icon, one-line what-this-is, one primary action.
- **Modal:** `shadow-popover`, backdrop `slate-900/40`, focus trapped, Esc closes.

## Anti-patterns (refused)

Eyebrow/kicker labels above headings; identical icon+heading+text card grids as page structure; nested cards; gradient text; decorative glass; colored left borders on callouts; hard offset shadows; emoji as icons; color-only status.
