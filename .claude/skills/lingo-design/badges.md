# Badges

> Dependencies: `colors.md`, `radius.md`

## Core Specs

- **Border:** 2px
- **Default radius:** 12px
- **Pill radius:** 9999px
- **Font:** bold weight (700), uppercase, 0.6px letter-spacing

## Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Default (small) | 12px | 8px | 4px |
| Large | 14px | 10px | 6px |

## Variants

### Brand
- **Background:** brand-softer
- **Border:** 2px, border-brand-subtle
- **Text:** fg-brand-strong

### Alternative (Neutral Soft)
- **Background:** neutral-primary-soft (white)
- **Border:** 2px, border-default
- **Text:** heading

### Gray (Neutral Medium)
- **Background:** neutral-secondary-medium
- **Border:** 2px, border-default
- **Text:** heading

### Danger
- **Background:** danger-soft
- **Border:** 2px, border-danger-subtle
- **Text:** fg-danger-strong

### Success
- **Background:** success-soft
- **Border:** 2px, border-success-subtle
- **Text:** fg-success-strong

### Warning
- **Background:** warning-soft
- **Border:** 2px, border-warning-subtle
- **Text:** fg-warning

### Dark
- **Background:** dark
- **Border:** transparent
- **Text:** white

## Pill Badges

Use 9999px radius instead of 12px on any variant.

## Badges with Icons

- Icon size (default): 12x12px
- Icon size (large): 14x14px
- Icon spacing: 6px margin next to label

## Icon-only Badge

Square shape — equalize dimensions to 28x28px, no horizontal text padding, 12px radius.

## Dismissible Badges

Badge content + a close button. Close button hover backgrounds per variant:

| Variant | Close button hover background |
|---|---|
| Brand | brand-soft |
| Alternative | neutral-tertiary |
| Gray | neutral-quaternary |
| Danger | danger-medium |
| Success | success-medium |
| Warning | warning-medium |

## Dot / Notification Badge

- Positioned absolutely: -4px top, -4px right
- Size: 14x14px, fully rounded
- 2px border in border-buffer color
- Background: danger
