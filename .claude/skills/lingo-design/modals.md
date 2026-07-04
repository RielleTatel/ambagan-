# Modals

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `buttons.md`, `inputs.md`

## Core Specs

### Overlay (Backdrop)
- Fixed, covers full screen
- Z-index: 40
- Background: black at 50% opacity
- Backdrop blur: small amount

### Content Container
- Background: neutral-primary (white)
- Radius: 12px (base)
- Border: 2px, border-default
- Shadow: shadow-xl
- Padding: 24px

## Anatomy

### Header
- Bottom border: 2px, border-default
- Top corners rounded (12px)
- Title: 22px, bold weight (700), heading color
- Close button: Ghost variant from `buttons.md`, 8px padding

### Body
- Vertical padding: 24px
- Vertical spacing between elements: 24px
- Text: 16px, 1.55 line-height, body color

### Footer
- Top border: 2px, border-default
- Bottom corners rounded (12px)
- Padding: 16px 24px

## Variants

### Default (Information)
Standard header + body + footer with primary/secondary action buttons.

### Pop-up (Confirmation)
Centered text, prominent icon, reduced padding:
- Body: 24px padding, text centered
- Icon: centered, 16px bottom margin, 56x56px, brand or status color

### Form Modal
Body contains inputs following `inputs.md` (2px borders). Vertical spacing between form elements: 16px.

## Rules

- Backdrop covers full screen with fixed positioning
- Content: white background, 2px border-default, 12px radius, shadow-xl
- Header/Footer separated by 2px border-default lines
- Close button must be present and functional
- Accessibility: `role="dialog"`, implement focus trap in code
- Dark mode automatic via token system
