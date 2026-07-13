import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Forest & Gold semantic tokens (from lingo-design skill)
        "warm-bg": "var(--warm-bg)",
        "neutral-primary": "var(--neutral-primary)",
        surface: "var(--surface)",
        "surface-warm": "var(--surface-warm)",
        brand: {
          DEFAULT: "var(--brand)",
          medium: "var(--brand-medium)",
          strong: "var(--brand-strong)",
          soft: "var(--brand-soft)",
          softer: "var(--brand-softer)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          medium: "var(--accent-medium)",
          strong: "var(--accent-strong)",
          soft: "var(--accent-soft)",
          softer: "var(--accent-softer)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
          strong: "var(--danger-strong)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
        },
        heading: "var(--heading)",
        body: "var(--body)",
        "body-subtle": "var(--body-subtle)",
        "fg-brand": "var(--fg-brand)",
        "fg-brand-strong": "var(--fg-brand-strong)",
        "fg-accent": "var(--fg-accent)",
        "fg-disabled": "var(--fg-disabled)",
        "border-default": "var(--border-default)",
        "border-default-strong": "var(--border-default-strong)",
        "border-brand": "var(--border-brand)",
        "border-brand-subtle": "var(--border-brand-subtle)",
        "border-danger": "var(--border-danger)",
        "border-accent": "var(--border-accent)",
        disabled: "var(--disabled)",

        // shadcn HSL tokens (kept so untouched primitives still work)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        DEFAULT: "12px",
        lg: "12px",
        md: "12px",
        sm: "12px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "DIN 2014 Rounded", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        xs: "0 2px 0 var(--border-default)",
        sm: "0 2px 0 var(--border-default)",
        md: "0 4px 0 var(--border-default)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
