# Dropdown

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `inputs.md`

## Core Specs

### Chevron Icon
- Size: 18x18px
- Spacing: 6px left margin, -2px right margin
- Color: inherits from trigger button

### Menu Container
- Background: neutral-primary-soft (white)
- Border: 2px, border-default
- Radius: 12px (base)
- Shadow: shadow-md (flat 4px offset plus a soft ambient layer)
- Z-index: elevated above content

### Menu List
- Padding: 8px
- Font: 15px, body color, bold weight (700)

### Menu Item
- Layout: inline-flex, vertically centered, full width
- Padding: 12px horizontal, 10px vertical
- Radius: 12px
- Hover: brand-softer background, fg-brand-strong text
- Transition: colors, 150ms ease-out

## Trigger Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Small | 14px | 14px | 10px |
| Base | 15px | 18px | 12px |
| Large | 16px | 24px | 14px |

## Icon-only Trigger

- Padding: 10px
- Min size: 44x44px
- Icon: 20x20px

## Variants

### Default
- Menu width: 200px, items have 12px radius

### With Divider
- Top 2px border (border-default) between child groups, skip first group

### With Header
- Header padding: 16px horizontal, 12px vertical
- Bottom border: 2px, border-default
- Name: heading color, 15px, bold weight (700)
- Email: body-subtle color, 14px, truncated

### With Icons
- Icon before label: 18x18px, 10px right margin, body color
- On hover, icon color changes to fg-brand-strong

### With Checkbox / Radio
- Inputs: 18x18px, 12px radius for checkboxes, focus ring in brand-soft
- Helper text: 13px, body-subtle color, 4px top margin

### With Search
- Search input at top of menu following `inputs.md` specs (2px border)
- Left icon: 14px left padding, input 40px left padding

### Scrollable
- Max height: 240px, vertical scroll overflow

## States

| State | Appearance |
|---|---|
| Focused trigger | no outline, 2px brand ring |
| Hover item | brand-softer background, fg-brand-strong text |
| Active/open item | brand-soft background, fg-brand-strong text |
| Disabled item | fg-disabled text, not-allowed cursor, no pointer events |
