# Buttons

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Core Specs (every button except ghost and disabled)

- **Radius:** 12px (base) for all sizes; 9999px only when explicitly used as a pill
- **Border:** 2px solid
- **Drop-shadow effect:** Every button except ghost and disabled gets a flat, offset drop-shadow that sits directly under the button — giving the tactile, "pressable" feel of the reference design:
  - `box-shadow: 0 4px 0 var(--shadow-{variant});`
  - On `:active` / pressed state, the button shifts down 2px and the shadow shrinks to `0 2px 0 var(--shadow-{variant});`
  - On `:hover`, the shadow stays at `0 4px 0` but the background lightens slightly
- **Font weight:** 700 (bold)
- **Font:** din-2014-rounded-variable
- **Text transform:** uppercase
- **Letter-spacing:** 0.8px
- **Box sizing:** border-box
- **Transition:** background-color and transform 100ms ease-out

## Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Extra small | 12px | 14px | 8px |
| Small | 13px | 16px | 10px |
| Base (default) | 15px | 20px | 14px |
| Large | 16px | 28px | 16px |
| Extra large | 17px | 32px | 18px |

## Variants

### Brand
- **Background:** brand token
- **Border:** transparent (or 2px brand-strong if outlined treatment is needed)
- **Text:** white
- **Hover:** brand-medium background
- **Focus ring:** 4px, brand-soft color
- **Drop-shadow:** `0 4px 0 var(--shadow-brand)` (uses brand-strong color)

### Secondary
- **Background:** neutral-primary-soft (white)
- **Border:** 2px, border-default
- **Text:** body color
- **Hover:** neutral-secondary-medium background, heading text color
- **Focus ring:** 4px, neutral-tertiary color
- **Drop-shadow:** `0 4px 0 var(--shadow-secondary)` (uses border-default color)

### Tertiary
- **Background:** neutral-primary-soft (white)
- **Border:** 2px, border-default
- **Text:** fg-brand color
- **Hover:** brand-softer background
- **Focus ring:** 4px, brand-soft color
- **Drop-shadow:** `0 4px 0 var(--shadow-secondary)`

### Success
- **Background:** success token
- **Border:** transparent
- **Text:** white
- **Hover:** success-medium background
- **Focus ring:** 4px, success-soft color
- **Drop-shadow:** `0 4px 0 var(--shadow-success)`

### Danger
- **Background:** danger token
- **Border:** transparent
- **Text:** white
- **Hover:** danger-medium background
- **Focus ring:** 4px, danger-soft color
- **Drop-shadow:** `0 4px 0 var(--shadow-danger)`

### Warning
- **Background:** warning token
- **Border:** transparent
- **Text:** dark color
- **Hover:** warning-medium background
- **Focus ring:** 4px, warning-soft color
- **Drop-shadow:** `0 4px 0 var(--shadow-warning)`

### Dark
- **Background:** dark token
- **Border:** transparent
- **Text:** white
- **Hover:** dark-strong background
- **Focus ring:** 4px, neutral-tertiary color
- **Drop-shadow:** `0 4px 0 var(--shadow-dark)`

### Ghost (NO drop-shadow)
- **Background:** transparent
- **Border:** transparent
- **Text:** heading color
- **Hover:** neutral-secondary-medium background
- **Focus ring:** 4px, neutral-tertiary color
- **No drop-shadow effect**

### Disabled (NO drop-shadow)
- **Background:** disabled token
- **Border:** 2px, border-default
- **Text:** fg-disabled color
- **Cursor:** not-allowed
- **No hover, no focus, no drop-shadow**

## Pressed / Active State

Across every variant that uses the drop-shadow:
- Translate the button 2px down (`transform: translateY(2px);`)
- Reduce shadow offset to `0 2px 0 var(--shadow-{variant});`
- This produces the tactile "press" effect characteristic of the reference design.

## Icons in Buttons

- Icon size: 18x18px
- Spacing: 8px gap between icon and label
- Layout: inline-flex, vertically centered
- Icons inherit the button's text color
