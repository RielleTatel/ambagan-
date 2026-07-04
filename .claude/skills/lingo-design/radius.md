# Border Radius

| Token | Value | Default usage |
|---|---|---|
| base | 12px | Buttons, cards, inputs, modals, sections, alerts, dropdowns, popovers, badges, tooltips, sidebars, table wrappers — the universal radius |
| default | 12px | Dropdown items, small controls, chips |
| sm | 12px | Checkboxes, tiny elements (kept at 12px for consistency; only icons inside small chips may use a smaller value when truly necessary) |
| full | 9999px | Pills, avatars, toggles, dot indicators |

## Rules

- 12px is the universal radius across the entire product — every element uses 12px unless it is explicitly a pill/circle (9999px)
- Never use arbitrary radius values outside this scale
- Radius must be consistent within each component family
- Small surfaces (checkboxes, micro-icons inside badges) may use 6px only when 12px would visually distort the element; default still favors 12px
