# Sidebars

> Dependencies: `colors.md`, `radius.md`, `typography.md`, `badges.md`, `alerts.md`

## Core Specs

- Background: neutral-primary-soft (white)
- Right border: 2px, border-default (for left-sidebar); left border for right-sidebar
- Width: 256px

## Anatomy

### Outer Container
Hidden on mobile, visible at small breakpoint. Needs a toggle/trigger for mobile.

### Inner Wrapper
- Full height, vertical scroll overflow
- Padding: 12px horizontal, 16px vertical

### Navigation List
- Vertical spacing: 8px between items
- Font weight: bold (700), uppercase, 0.6px letter-spacing

### Navigation Item
- Layout: flex, vertically centered
- Padding: 12px horizontal, 12px vertical
- Text: heading color
- Radius: 12px (base)
- Border: 2px transparent (becomes visible on active state)
- Hover: brand-softer background
- Transition: colors, 100ms ease-out
- Icon: 22x22px, body color, hover → fg-brand color, 75ms transition
- Label: 12px left margin from icon

### Active Item
- Background: brand-softer
- Border: 2px, border-brand-subtle
- Text: fg-brand-strong
- Icon: fg-brand color

### Separator
- 16px top padding, 16px top margin
- Top border: 2px, border-default
- 8px vertical spacing below

### Bottom CTA / Card
- Padding: 16px
- Top margin: 24px
- Radius: 12px (base)
- Border: 2px, border-brand-subtle
- Background: brand-softer
- Can also use any alert variant from `alerts.md`

## Rules

- Responsive: hidden on mobile with a trigger mechanism
- Icons: 22x22px, body color (hover/active: fg-brand color)
- Multi-level menus: indent with 44px left padding
- Spacing follows 8px grid
- Active items use a 2px border-brand-subtle outline plus brand-softer fill
- Only neutral, brand, or status tokens — no arbitrary colors
