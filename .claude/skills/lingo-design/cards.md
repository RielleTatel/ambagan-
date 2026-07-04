# Cards

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `typography.md`

## Core Specs

- **Background:** neutral-primary-soft (white)
- **Border:** 2px, border-default color
- **Radius:** 12px (base)
- **Shadow:** shadow-xs (a flat 2px offset drop-shadow under the card)

## Card Heading

- Desktop: 20px, bold weight (700), heading color
- Mobile: 18px, bold weight (700), heading color
- Never skip heading levels — the page hierarchy must logically arrive at the card heading level.

## States

### Static Card (no interactivity)
- Background: neutral-primary-soft (white)
- Border: 2px, border-default
- Radius: 12px
- Shadow: shadow-xs
- No hover styles. Non-interactive cards must NOT have hover background changes.

### Interactive Card (clickable)
- Same base styles as static card
- Hover: brand-softer background, border-brand-subtle border
- Active/pressed: shifts down 2px and shadow shrinks
- Transition: background-color, border-color, transform 100ms ease-out
- Cursor: pointer

## Rules

- Background: neutral-primary-soft (white only — cards never use tinted backgrounds)
- Border: 2px, border-default
- Radius: 12px
- Shadow: shadow-xs (flat offset, no soft blur)
- Interactive hover: brand-softer background + border-brand-subtle
- Non-interactive: no hover styles
