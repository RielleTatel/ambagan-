# Avatars

> Dependencies: `colors.md`, `radius.md`

## Core Specs

- **Circular shape:** fully rounded (9999px)
- **Rounded square shape:** 12px radius
- **Default size:** 40x40px
- **Image fit:** cover

## Sizes

| Size | Dimensions | Radius |
|---|---|---|
| Extra Small | 20x20px | 12px |
| Small | 28x28px | 12px |
| Base | 36x36px | 12px |
| Large | 48x48px | 12px |
| XL | 60x60px | 12px |
| 2XL | 72x72px | 12px |

## Bordered Avatar

- 4px padding, fully rounded, 2px outline in border-default color
- Alternative: 2px box-shadow ring in border-default color

## Stacked Avatars

- Displayed in a row (flex)
- Each avatar: 40x40px, fully rounded, 2px border in border-buffer color
- Overlap: -16px negative margin on all except first

### Stacked Counter
- Same size as avatars (40x40px), fully rounded
- Background: brand, text: white, 13px font, bold weight (700)
- Same overlap margin as other avatars

## Avatar with Text

- Flex row, 12px gap between avatar and text
- Avatar: 40x40px, fully rounded, cover fit
- Name: heading color, bold weight (700)
- Subtitle: 14px, body color
