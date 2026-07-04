# Typography

> Dependencies: `colors.md`

## Core Rules

- **Font:** din-2014-rounded-variable, "DIN 2014 Rounded", "Nunito", system-ui, sans-serif — configured at app level, never override
- **Font weights available:** 400 (regular), 500 (medium), 700 (bold), 800 (extra bold)
- **Headings:** bold weight (700), heading text color, slightly tighter letter-spacing for an approachable, friendly tone
- **Body copy:** body text color, never use brand color for paragraphs longer than one sentence
- **Semantic HTML:** Use `h1`–`h6` in order, never skip levels

## Heading Scale

### Desktop

| Element | Size | Line-height | Letter-spacing | Margin-bottom |
|---|---|---|---|---|
| `h1` | 48px | 1.1 | -0.4px | 24px |
| `h2` | 36px | 1.15 | -0.3px | 20px |
| `h3` | 28px | 1.2 | -0.2px | 16px |
| `h4` | 24px | 1.25 | — | 12px |
| `h5` | 20px | 1.3 | — | 12px |
| `h6` | 18px | 1.35 | — | 8px |

### Responsive

| Element | Tablet (≥768px) | Mobile (default) |
|---|---|---|
| `h1` | 36px | 28px |
| `h2` | 32px | 24px |
| `h3` | 26px | 22px |
| `h4` | 22px | 20px |
| `h5` | 20px | 18px |
| `h6` | 18px | 16px |

Mobile-first: start with mobile sizes, scale up at tablet and desktop breakpoints.

Never reduce line-height below 1.1 for any heading.

## Paragraphs

### Leading Paragraph
- Size: 19px
- Weight: 500 (medium)
- Color: body
- Line-height: 1.6
- Max width: ~70 characters

### Normal Paragraph
- Size: 17px
- Weight: 400 (regular)
- Color: body
- Line-height: 1.55
- Max width: ~65 characters

### Small Supporting Copy
- Size: 14px
- Weight: 400 (regular)
- Color: body
- Line-height: 1.5
- Use only for helper text, legal text, captions, metadata.

## UI Labels

| Context | Size | Weight |
|---|---|---|
| Button labels | 16px | 700 (bold) |
| Input labels | 14px or 16px | 700 (bold) |
| Captions / meta / badges | 13px or 14px | 700 (bold) |

Button labels are uppercase by default with 0.8px letter-spacing for the bold, friendly feel typical of the reference design.

Do not apply paragraph line-height (1.55) to control labels.

## Links

- **Inline links:** Same size as surrounding text, fg-brand color, bold weight, no underline by default, hover → underline
- **CTA links:** fg-brand color, bold weight, uppercase, hover → underline

## Emphasis

- `<strong>` for high-priority emphasis in body text — use bold weight
- `<em>` for tone emphasis only, not visual hierarchy
- All-caps for short labels and primary calls to action: uppercase, 0.8px letter-spacing, 13px or 14px

## Dark Mode

Hierarchy stays identical. Only color tokens change (automatic via CSS custom properties). Size, weight, and spacing remain constant.
