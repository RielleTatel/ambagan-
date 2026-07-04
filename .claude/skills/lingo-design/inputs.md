# Inputs

> Dependencies: `colors.md`, `radius.md`

## Core Specs

- **Display:** block, full width
- **Radius:** 12px (base)
- **Border:** 2px, border-default
- **Background:** neutral-primary-soft (white)
- **Shadow:** none by default — keep inputs flat against the white surface
- **Font:** 16px, heading color, din-2014-rounded-variable
- **Padding:** 14px horizontal, 12px vertical
- **Placeholder:** body color
- **Transition:** border-color and background-color, 150ms ease-out

## Label

- Display: block
- Font: 14px, bold weight (700), heading color, uppercase, 0.6px letter-spacing
- Margin bottom: 8px
- Label `htmlFor` must match the input `id`

## States

### Default
- Border: 2px, border-default
- Background: neutral-primary-soft (white)

### Hover
- Border: 2px, border-default-strong

### Focus
- No outline
- Border: 2px, border-brand
- Ring: 2px, brand-soft (offset outside the border for the chunky outlined look)

### Success
- Border: 2px, border-success
- Focus ring: 2px, success-soft

### Error / Danger
- Border: 2px, border-danger
- Focus ring: 2px, danger-soft

### Disabled
- Background: disabled
- Text: fg-disabled
- Cursor: not-allowed

## Input with Icons

- Icon size: 18x18px
- Icon color: body
- Container: relative positioned wrapper
- Start icon: absolutely positioned left, 14px left padding — input gets 40px left padding
- End icon: absolutely positioned right, 14px right padding — input gets 40px right padding
- Icons vertically centered within the wrapper

## Rules

- Every input must have a unique `id`
- Every label must have a matching `htmlFor`
- Padding: 14px horizontal, 12px vertical unless overridden for icon variants
- Border width is always 2px — never reduce to 1px
- No arbitrary hex or hardcoded colors
