# Tabs

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Core Specs

- Typography: 14px, bold weight (700), body color, uppercase, 0.6px letter-spacing
- Transitions: colors and transform, 150ms ease-out

## Variants

### 1. Underline (Default)

**Wrapper:** bottom border, 2px border-default

**Tab Item:**
- Padding: 18px horizontal, 16px vertical
- Bottom border: 4px, transparent (offset down so it overlaps the wrapper border on active)
- Top corners: 12px radius
- Transition: colors, 150ms ease-out

| State | Appearance |
|---|---|
| Active | fg-brand text, 4px border-brand bottom border |
| Inactive | transparent bottom border; hover → heading text, 4px border-default-strong bottom border |
| Disabled | fg-disabled text, not-allowed cursor |

### 2. Pills

**Tab Item:**
- Padding: 18px horizontal, 12px vertical
- Radius: 12px (base)
- Border: 2px, transparent
- Font weight: bold (700)
- Transition: all, 150ms ease-out

| State | Appearance |
|---|---|
| Active | brand background, white text, shadow-xs |
| Inactive | body text; hover → brand-softer background, fg-brand-strong text |
| Disabled | fg-disabled text, not-allowed cursor |

### 3. Full Width

Children overlap with -2px left margin on all except first.

**Tab Item:**
- Full width, centered text
- Padding: 18px horizontal, 16px vertical
- Background: neutral-primary-soft (white)
- Border: 2px, border-default
- Transition: colors, 150ms ease-out
- Hover: brand-softer background, fg-brand-strong text

| State | Appearance |
|---|---|
| Active | brand-softer background, fg-brand-strong text, 2px border-brand-subtle |
| First item | rounded start (12px) |
| Last item | rounded end (12px) |

## Tabs with Icons

- Icon size: 18x18px or 20x20px
- Spacing: 10px right margin
- Layout: inline-flex, centered
- Icons inherit the text color of the tab state
