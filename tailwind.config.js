/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // App palette (planning doc)
        bg: "var(--app-bg)",
        sidebar: "var(--app-sidebar)",
        card: "var(--app-card)",
        muted: "var(--app-muted)",
        // shadcn tokens
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        muted2: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // UntitledUI aliases
        tertiary: "var(--color-tertiary)",
        "fg-secondary": "var(--color-fg-secondary)",
        "fg-tertiary": "var(--color-fg-tertiary)",
        "fg-quaternary": "var(--color-fg-quaternary)",
        "fg-success-primary": "var(--color-fg-success-primary)",
        "fg-error-primary": "var(--color-fg-error-primary)",
        "border-primary": "var(--color-border-primary)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
