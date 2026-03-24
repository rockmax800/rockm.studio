import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    /* ── 8px spacing scale (Brockmann) ────────────────────── */
    spacing: {
      px: "1px",
      "0": "0px",
      "0.5": "2px",
      "1": "4px",
      "1.5": "6px",
      "2": "8px",        /* base rhythm */
      "2.5": "10px",
      "3": "12px",
      "3.5": "14px",
      "4": "16px",       /* 2× */
      "5": "20px",
      "6": "24px",       /* 3× */
      "7": "28px",
      "8": "32px",       /* 4× */
      "9": "36px",
      "10": "40px",      /* 5× */
      "11": "44px",
      "12": "48px",      /* 6× */
      "14": "56px",      /* 7× */
      "16": "64px",      /* 8× */
      "20": "80px",
      "24": "96px",
      "28": "112px",
      "32": "128px",
      "36": "144px",
      "40": "160px",
      "44": "176px",
      "48": "192px",
      "52": "208px",
      "56": "224px",
      "60": "240px",
      "64": "256px",
      "72": "288px",
      "80": "320px",
      "96": "384px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "display":       ["44px", { lineHeight: "110%", fontWeight: "700", letterSpacing: "-0.03em" }],
        "page-title":    ["32px", { lineHeight: "120%", fontWeight: "700", letterSpacing: "-0.025em" }],
        "section-title": ["20px", { lineHeight: "120%", fontWeight: "700", letterSpacing: "-0.015em" }],
        "card-title":    ["16px", { lineHeight: "130%", fontWeight: "600", letterSpacing: "-0.01em" }],
        "body":          ["15px", { lineHeight: "160%" }],
        "body-lg":       ["16px", { lineHeight: "160%" }],
        "meta":          ["13px", { lineHeight: "150%", fontWeight: "500" }],
        "label":         ["12px", { lineHeight: "130%", fontWeight: "600" }],
        "micro":         ["11px", { lineHeight: "130%", fontWeight: "600" }],
      },
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        status: {
          neutral: "hsl(var(--status-neutral))",
          blue: "hsl(var(--status-blue))",
          cyan: "hsl(var(--status-cyan))",
          amber: "hsl(var(--status-amber))",
          green: "hsl(var(--status-green))",
          red: "hsl(var(--status-red))",
          muted: "hsl(var(--status-muted))",
        },
        surface: {
          raised: "hsl(var(--surface-raised))",
          overlay: "hsl(var(--surface-overlay))",
          sunken: "hsl(var(--surface-sunken))",
          glass: "hsl(var(--surface-glass))",
        },
        lifecycle: {
          draft: "hsl(var(--lifecycle-draft))",
          ready: "hsl(var(--lifecycle-ready))",
          "in-progress": "hsl(var(--lifecycle-in-progress))",
          review: "hsl(var(--lifecycle-review))",
          rework: "hsl(var(--lifecycle-rework))",
          blocked: "hsl(var(--lifecycle-blocked))",
          escalated: "hsl(var(--lifecycle-escalated))",
          validated: "hsl(var(--lifecycle-validated))",
          done: "hsl(var(--lifecycle-done))",
          deploying: "hsl(var(--lifecycle-deploying))",
          running: "hsl(var(--lifecycle-running))",
          failed: "hsl(var(--lifecycle-failed))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "var(--radius-card)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        heavy: "var(--shadow-heavy)",
        glow: "var(--shadow-glow)",
      },
      gridTemplateColumns: {
        "12": "repeat(12, minmax(0, 1fr))",
        "layout": "280px 1fr",
        "layout-3col": "1fr 1fr 1fr",
      },
      maxWidth: {
        "grid": "1440px",
        "content": "1280px",
      },
      width: {
        "sidebar": "280px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.22s ease-out forwards",
      },
      transitionDuration: {
        "180": "180ms",
        "220": "220ms",
        "250": "250ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
