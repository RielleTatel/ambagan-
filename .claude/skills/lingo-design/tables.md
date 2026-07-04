# Tables

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Wrapper

- Horizontal scroll overflow
- Background: neutral-primary-soft (white)
- Radius: 12px (base)
- Border: 2px, border-default
- Shadow: shadow-xs (flat 2px offset)

## Table Element

- Full width, left-aligned text (right-aligned for RTL)
- Font: 15px, body color

## Table Head

- Font: 14px, body color, bold weight (700), uppercase, 0.6px letter-spacing
- Background: neutral-secondary-medium
- Bottom border: 2px, border-default
- Cell padding: 24px horizontal, 14px vertical

## Table Body

- Row background: neutral-primary (white)
- Row bottom border: 1px, border-default-subtle (kept hairline so dense data stays readable)
- Row hover: brand-softer background (optional)
- Row header: bold weight (700), heading color, no-wrap
- Cell padding: 24px horizontal, 16px vertical

## Rules

- Wrapper must have horizontal scroll overflow for responsive scrolling
- Wrapper border is 2px, internal row separators are 1px hairline
- Last row: omit bottom border to avoid doubling with wrapper border
- Row headers: always `scope="row"` for semantic structure
- Hover on rows is optional
- No arbitrary hex codes — use token colors only
