# Button Groups

> Dependencies: `buttons.md`, `colors.md`, `radius.md`

## Core Specs

- **Wrapper:** inline-flex, 12px radius, shadow-xs (flat 2px offset)
- **Children overlap:** -2px left margin on all except first button (matches the 2px border width)
- **Buttons inside the group must NOT have individual drop-shadows.** Only the wrapper has a shadow.

## Anatomy

### Wrapper
- Display: inline-flex
- Radius: 12px
- Shadow: shadow-xs

### First Button
- 12px radius on inline-start side only, 0 on inline-end

### Middle Button(s)
- No radius (0 on all corners)

### Last Button
- 12px radius on inline-end side only, 0 on inline-start

### All buttons except first
- -2px left margin to overlap 2px borders cleanly

## Rules

- Buttons inside groups follow all styles from `buttons.md` (background, 2px border, focus rings) except the individual drop-shadow effect
- Icon-only buttons: 18x18px icon, match height of text buttons
