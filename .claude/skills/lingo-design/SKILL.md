---
name: lingo-design
description: Use when writing or editing any UI code in this project — components, pages, layouts, forms, styling. Defines the Ambagan visual design language (Forest & Gold — deep forest green primary, warm gold accent, mint surfaces on cream page background, 2px borders, 12px radius, tactile buttons with flat drop-shadow). Established, trustworthy, slightly premium — built for a financial app. Read the module files referenced below before generating JSX.
---

# Design System — Agent Instructions

This skill describes the visual design language for all UI output. Every component, layout, and page should follow the design specs in the module files below. These describe *what the design looks like* — you choose how to implement the styles.

## Style
Forest & Gold — an established, trustworthy, slightly premium interface built for a financial app. Deep forest green (`#1A4731`) as the primary, warm gold (`#C9962A`) as the accent, mint surfaces (`#E8F5EE`) for pill badges and success states, and a warm cream (`#F5F0E8`) page background instead of clinical white. Chunky 2px borders, fully rounded soft shapes (12px), bold rounded display typography, and tactile buttons with a flat drop-shadow that gives every action a pressable, physical feel.

## Before Writing Any Code

1. **Read every module that applies.** For a landing page, read at minimum: `layout.md`, `typography.md`, `colors.md`, `buttons.md`, `cards.md`, `shadows.md`, `radius.md`, `borders.md`. Do NOT write JSX until you have loaded all relevant modules.

## Critical Rules

- **Tokens are AGNOSTIC, NOT framework classes:** The tokens defined in the `.md` files (like `neutral-primary-soft`, `heading`, `border-default`) are agnostic design system tokens, NOT literal classes from any specific styling framework. Do not blindly use class names that match these tokens unless you have explicitly mapped them in your styling configuration. You must implement the mapping yourself.

- **Cross-reference modules.** A card containing buttons must satisfy both `cards.md` AND `buttons.md`.
- **Dark mode is automatic.** The CSS custom properties resolve differently in light/dark via `@media (prefers-color-scheme: dark)`. Never manually swap colors.
- **Every interactive element needs hover, focus, and disabled states** — defined in the relevant module.
- **Use semantic HTML:** proper heading hierarchy (`h1`→`h6`), `<button>` for actions, `<a>` for navigation, ARIA attributes where needed.
- **Page backgrounds are Warm bg cream (`#F5F0E8`); card/section backgrounds are pure white (`#FFFFFF`)** — never tint a card background beyond white or mint (`surface`); use 2px borders to delimit sections.
- **All borders for delimiting sections, cards, and inputs are 2px wide.**
- **All elements use a 12px border-radius** unless they are explicitly pills, avatars, or dot indicators (9999px).
- **Buttons use a flat `0 4px 0` drop-shadow** in a darker tone of their variant — no glint or gradient highlight effects.

## Module Index

### Foundation (read first for any UI work)
- [colors.md](colors.md) — all background, text, and border color tokens
- [typography.md](typography.md) — heading scale, paragraphs, labels, links
- [layout.md](layout.md) — spacing rhythm, containers, animation, visual depth
- [radius.md](radius.md) — border-radius scale
- [shadows.md](shadows.md) — elevation tokens
- [borders.md](borders.md) — border widths and styles

### Components
- [buttons.md](buttons.md) — button variants, sizes, states, drop-shadow effect
- [button-group.md](button-group.md) — grouped button structure
- [cards.md](cards.md) — card structure, background, interactivity
- [inputs.md](inputs.md) — form controls, labels, states
- [alerts.md](alerts.md) — alert variants
- [badges.md](badges.md) — badge variants, sizes, dismissible chips
- [lists.md](lists.md) — list components
- [avatars.md](avatars.md) — avatar variants, sizes, indicators
- [icon-shapes.md](icon-shapes.md) — icon containers

### Complex Components
- [accordion.md](accordion.md) — accordion variants
- [dropdown.md](dropdown.md) — dropdown menus
- [modals.md](modals.md) — modal dialogs
- [tabs.md](tabs.md) — tab navigation
- [tables.md](tables.md) — table structure
- [pagination.md](pagination.md) — pagination components
- [sidebars.md](sidebars.md) — sidebar navigation
- [radios-checkboxes-toggle.md](radios-checkboxes-toggle.md) — selection controls
- [tooltips-popovers.md](tooltips-popovers.md) — tooltips and popovers
- [content.md](content.md) — grid system, responsiveness
