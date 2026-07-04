# Shadows

The reference design favors flat, offset drop-shadows that sit directly under elements (especially buttons and cards) rather than soft ambient blurs. Use these tokens accordingly.

| Token | CSS value |
|---|---|
| shadow-2xs | `0 2px 0 rgb(0 0 0 / 0.05)` |
| shadow-xs | `0 2px 0 rgb(229 229 229 / 1)` |
| shadow-sm | `0 4px 0 rgb(229 229 229 / 1)` |
| shadow-md | `0 4px 0 rgb(229 229 229 / 1), 0 6px 12px -4px rgb(0 0 0 / 0.06)` |
| shadow-lg | `0 6px 0 rgb(229 229 229 / 1), 0 10px 20px -6px rgb(0 0 0 / 0.08)` |
| shadow-xl | `0 8px 0 rgb(229 229 229 / 1), 0 16px 32px -8px rgb(0 0 0 / 0.1)` |
| shadow-2xl | `0 12px 24px -8px rgb(0 0 0 / 0.18)` |

## Component Mapping

| Component type | Token |
|---|---|
| Subtle separators, tiny UI details | shadow-2xs |
| Inputs, lightweight cards, buttons (resting offset) | shadow-xs or shadow-sm |
| Standard cards, popovers, dropdowns | shadow-sm or shadow-md |
| Prominent cards, sticky surfaces | shadow-md or shadow-lg |
| Modals, high-priority overlays | shadow-xl |
| Hero overlays, top-level emphasis (sparingly) | shadow-2xl |

## Rules

- Use only these tokens — no custom box-shadow values
- Buttons use a dedicated `0 4px 0 var(--shadow-{variant})` drop-shadow defined in `buttons.md` — not the generic shadow tokens
- Keep elevation steps intentional; avoid jumping multiple levels
- Components in the same family share the same baseline elevation
- Prefer flat offset shadows over blurred ambient shadows to match the reference style
- Never stack multiple unrelated shadow tokens on one element
- Never use shadow-xl/shadow-2xl for dense list items or body containers
