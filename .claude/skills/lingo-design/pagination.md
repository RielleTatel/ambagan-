# Pagination

> Dependencies: `colors.md`, `radius.md`

## Container

Font: 15px, bold weight (700). Items displayed as flex with -2px overlap for seamless 2px borders.

## Pagination Item

- Layout: flex, centered both axes
- Size: 40x40px
- Text: body color, bold weight (700)
- Background: neutral-primary-soft (white)
- Border: 2px, border-default
- Hover: brand-softer background, fg-brand-strong text
- Focus: no outline, 2px brand ring
- Overlap: -2px left margin

## Previous / Next Buttons

- Horizontal padding: 14px, height: 40px
- First item: 12px radius on inline-start side
- Last item: 12px radius on inline-end side

## Active Page Item

- Text: white
- Background: brand
- Border: transparent
- Hover text: white (stays same)
- Hover background: brand-medium

## Rules

- Display as flex with -2px child overlap for seamless 2px borders
- Items: white background, 2px border-default border, body text
- Active: white text, brand background
- First item: rounded start (12px), Last item: rounded end (12px)
- All items need hover and focus states
