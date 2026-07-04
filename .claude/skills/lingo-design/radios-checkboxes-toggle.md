# Radios, Checkboxes & Toggles

> Dependencies: `colors.md`, `radius.md`

## Checkbox

- Size: 22x22px
- Radius: 12px
- Border: 2px, border-default
- Background: neutral-primary-soft (white)
- Focus ring: 2px, brand-soft
- Checked: brand background, white indicator (checkmark)

### Disabled
- Border: 2px, border-light
- Text: fg-disabled

## Radio

- Size: 22x22px
- Radius: fully rounded (9999px)
- Border: 2px, border-default
- Background: neutral-primary-soft (white)
- Focus ring: 2px, brand-soft
- Checked: 2px border-brand, indicator: brand color filled dot

### Disabled
- Border: 2px, border-light-medium
- Text: fg-disabled

Group all radio items under the same `name` attribute.

## Toggle

### Track
- Fully rounded
- Background: neutral-quaternary
- 2px border in border-default
- Focus-within ring: 2px, brand-soft
- Checked track: brand background, border transparent
- Disabled track: neutral-tertiary background

### Thumb
- Fully rounded
- Background: white
- 2px border in border-buffer color
- Subtle shadow-xs for elevation against the track

### Disabled
- Track: neutral-tertiary background
- Label: fg-disabled text

## Rules

- All selection inputs must have `id` matching label `htmlFor`
- All borders use 2px width — never reduce to 1px
- Focus states use the appropriate brand token for each control type
- Disabled states: no hover/focus interaction
