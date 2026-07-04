# Layout & Spacing

## Spacing Rhythm

Base unit: **8px**. All spacing values should be multiples of 8px.

| Context | Value |
|---|---|
| Section vertical padding | 96px |
| Section header → content | 48px or 64px |
| Heading → paragraph | 16px |
| Container horizontal padding | 24px |
| Flex/grid row gap | 16px |
| Card grid gap | 24px |
| Wide component grid gap | 32px |
| Column layout gap | 48px |

## Container

Standard section container: max-width 1152px, centered, 24px horizontal padding.

Every major section wraps content in this container.

## Content Composition Order

Inside each section, follow this order:
1. Heading (`h1`–`h3`)
2. Leading paragraph
3. Normal paragraph(s)
4. Lists, CTA links, or component grids

## Section Pattern

Each section has:
- 96px vertical padding
- A pure white background (neutral-primary-soft) — every section uses white; no alternating tinted backgrounds
- A centered container (max-width 1152px, 24px horizontal padding)
- A 2px border-default top divider when separation between consecutive sections is needed (rather than tinted backgrounds)
- A section header area with 48px bottom margin
- Section content below

## Motion & Animation

- Prefer CSS-native: `transition`, `animation`, `@keyframes`. Use Motion library only when CSS cannot achieve the behavior.
- Favor short, snappy transitions (100–150ms ease-out) for micro-interactions — buttons, cards, and inputs should feel tactile and responsive.
- Reserve scroll-triggered and hover transitions for moments that reinforce hierarchy or reward attention.
- Pressed states for buttons translate down 2px to mimic a physical press (paired with the drop-shadow shrink defined in `buttons.md`).

## Backgrounds & Visual Depth

- The whole product uses a pure white (#FFFFFF) canvas across every section — never tint section backgrounds.
- Depth comes from 2px crisp borders, flat offset drop-shadows, and bold illustrative accents — not from gradients or layered transparencies.
- Decorative accents (illustrations, mascot art, large emoji-style icons) may appear inside sections, but the surrounding background stays white.
- No gradient meshes, noise textures, or grain overlays on layout surfaces.

## Must

- All sections: pure white background, 96px vertical padding
- All containers: max-width 1152px, centered, 24px horizontal padding
- Section headers: 48px or 64px bottom margin
- Use 2px border-default lines (not background tints) when sections need visible separation
- Consistent vertical rhythm, no crowded sections
- Layouts readable and properly spaced on both desktop and mobile
