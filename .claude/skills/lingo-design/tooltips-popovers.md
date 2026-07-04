# Tooltips & Popovers

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Tooltips

### Core Specs
- Padding: 12px horizontal, 8px vertical
- Font: 14px, bold weight (700)
- Radius: 12px
- Shadow: shadow-xs (flat 2px offset)
- Transition: opacity, 200ms ease-out

### Dark (Default)
- Background: dark
- Text: white
- Border: transparent

### Light
- Background: neutral-primary (white)
- Text: heading color
- Border: 2px, border-default

## Popovers

### Core Specs
- Background: neutral-primary (white)
- Radius: 12px (base)
- Shadow: shadow-md (flat offset + soft ambient)
- Border: 2px, border-default
- Transition: opacity, 200ms ease-out

### Header / Title
- Padding: 14px horizontal, 12px vertical
- Background: neutral-secondary-medium
- Bottom border: 2px, border-default
- Font: 15px, bold weight (700), heading color

### Body / Content
- Standard: 14px horizontal, 12px vertical padding; 14px, body color
- Rich: 16px padding; 14px, body color

## Arrows

- Size: 10x10px rotated 45deg
- Color must match the background of the tooltip/popover variant
- Light variants need a 2px border on two adjacent sides matching border-default

## Rules

- Tooltips: 12px radius
- Popovers: 12px radius
- Dark tooltips: dark background, white text, no border
- Light tooltips/popovers: white background + 2px border-default
- Arrows match parent background color (and border for light variants)
