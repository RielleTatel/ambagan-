# Accordion

> Dependencies: `colors.md`, `radius.md`

## Core Specs

- **Wrapper:** full width, 2px border (border-default color), 12px radius — clips first/last item corners
- **Item separator:** 2px bottom border (border-default) on every item except last

## Trigger (Button)

- **Layout:** flex, space-between, full width
- **Padding:** 20px horizontal, 18px vertical
- **Font:** 16px, bold weight (700)
- **Text color:** heading
- **Background:** neutral-primary-soft (white)
- **Hover:** brand-softer background
- **Focus:** outline none, 2px ring in brand color
- **Transition:** colors, 150ms ease-out
- **Open state:** brand-softer background

## Panel (Content)

- **Padding:** 20px horizontal, 18px vertical
- **Background:** neutral-primary-soft (white)
- **Top border:** 2px, border-default color
- **Font:** 16px, body color, 1.55 line-height

## Chevron Icon

- Size: 18x18px
- Color: body text color
- Closed: 0deg rotation
- Open: 180deg rotation
- Transition: transform, 150ms ease-out

## Variants

### Default (Collapse)
One panel open at a time. Items stacked inside a single shared bordered/rounded wrapper.

### Separated Cards
Each item is independent — has its own 2px border, 12px radius, and shadow-xs (flat 2px offset). 12px bottom margin between items. No shared outer border.

### Always Open
Multiple panels can expand simultaneously. Same styling as Default.

### Flush
No outer border. Trigger and panel have white backgrounds. Only 2px bottom border dividers between items. Use inside containers that already provide a background.

## States

| State | Trigger appearance |
|---|---|
| Closed | heading text, neutral-primary-soft (white) background |
| Open | heading text, brand-softer background |
| Hover | brand-softer background |
| Focus | 2px brand ring, no outline |
| Disabled | fg-disabled text, not-allowed cursor, no hover/focus |
