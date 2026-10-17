/**
 * Tailwind CSS preset (Section 8.2): utilities read CSS variables from
 * css/tokens.css so a single file swap flips the whole theme.
 * darkMode is configured by the app: ['class', '[data-theme="dark"]'].
 * @type {import('tailwindcss').Config}
 */
const tokensPreset = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Token colours go through the `-rgb` channel triple their generator
        // emits, so an alpha modifier compiles: `bg-primary/15` →
        // `rgb(var(--primary-rgb) / 0.15)`. Written as `var(--primary)` a
        // `/15` utility silently generated nothing at all.
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken-rgb) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        text: 'rgb(var(--text-rgb) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        'text-faint': 'rgb(var(--text-faint-rgb) / <alpha-value>)',
        primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
        'primary-strong': 'rgb(var(--primary-strong-rgb) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft-rgb) / <alpha-value>)',
        'on-primary': 'rgb(var(--on-primary-rgb) / <alpha-value>)',
        // The prototype's `--lime`: primary buttons and the hero stat card.
        brand: 'rgb(var(--brand-rgb) / <alpha-value>)',
        'brand-text': 'rgb(var(--brand-text-rgb) / <alpha-value>)',
        'brand-soft': 'rgb(var(--brand-soft-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
        'accent-text': 'rgb(var(--accent-text-rgb) / <alpha-value>)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        'success-soft': 'rgb(var(--success-soft-rgb) / <alpha-value>)',
        'success-text': 'rgb(var(--success-text-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        'warning-soft': 'rgb(var(--warning-soft-rgb) / <alpha-value>)',
        'warning-text': 'rgb(var(--warning-text-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        'danger-soft': 'rgb(var(--danger-soft-rgb) / <alpha-value>)',
        'danger-text': 'rgb(var(--danger-text-rgb) / <alpha-value>)',
        info: 'rgb(var(--info-rgb) / <alpha-value>)',
        'info-soft': 'rgb(var(--info-soft-rgb) / <alpha-value>)',
        'info-text': 'rgb(var(--info-text-rgb) / <alpha-value>)',
        violet: 'rgb(var(--violet-rgb) / <alpha-value>)',
        'violet-soft': 'rgb(var(--violet-soft-rgb) / <alpha-value>)',
        'violet-text': 'rgb(var(--violet-text-rgb) / <alpha-value>)',
        rose: 'rgb(var(--rose-rgb) / <alpha-value>)',
        'rose-soft': 'rgb(var(--rose-soft-rgb) / <alpha-value>)',
        'rose-text': 'rgb(var(--rose-text-rgb) / <alpha-value>)',
        // The prototype's `--lavender` spanning panel (Workforce Overview).
        panel: 'rgb(var(--panel-bg-rgb) / <alpha-value>)',
        'panel-bg': 'rgb(var(--panel-bg-rgb) / <alpha-value>)',
        'panel-text': 'rgb(var(--panel-text-rgb) / <alpha-value>)',
        'panel-border': 'rgb(var(--panel-border-rgb) / <alpha-value>)',
        'panel-dot1': 'rgb(var(--panel-dot1-rgb) / <alpha-value>)',
        'panel-dot2': 'rgb(var(--panel-dot2-rgb) / <alpha-value>)',
        'panel-dot3': 'rgb(var(--panel-dot3-rgb) / <alpha-value>)',
        // Inverse navigation surface (2026-10-11 Home rebuild). `nav-active` is
        // the marigold pill; `nav-active-fg` the ink that sits on it.
        nav: 'rgb(var(--nav-bg-rgb) / <alpha-value>)',
        'nav-bg': 'rgb(var(--nav-bg-rgb) / <alpha-value>)',
        'nav-border': 'rgb(var(--nav-border-rgb) / <alpha-value>)',
        'nav-text': 'rgb(var(--nav-text-rgb) / <alpha-value>)',
        'nav-text-strong': 'rgb(var(--nav-text-strong-rgb) / <alpha-value>)',
        'nav-label': 'rgb(var(--nav-label-rgb) / <alpha-value>)',
        'nav-active': 'rgb(var(--nav-active-bg-rgb) / <alpha-value>)',
        'nav-active-fg': 'rgb(var(--nav-active-text-rgb) / <alpha-value>)',
        // The video room's stage surface — dark in both themes.
        stage: 'rgb(var(--stage-bg-rgb) / <alpha-value>)',
        'stage-bg': 'rgb(var(--stage-bg-rgb) / <alpha-value>)',
        'stage-raised': 'rgb(var(--stage-raised-rgb) / <alpha-value>)',
        'stage-text': 'rgb(var(--stage-text-rgb) / <alpha-value>)',
        'stage-muted': 'rgb(var(--stage-muted-rgb) / <alpha-value>)',
        'stage-border': 'rgb(var(--stage-border-rgb) / <alpha-value>)',
        'chip-indigo': 'rgb(var(--chip-indigo-bg-rgb) / <alpha-value>)',
        'chip-indigo-fg': 'rgb(var(--chip-indigo-fg-rgb) / <alpha-value>)',
        'chip-marigold': 'rgb(var(--chip-marigold-bg-rgb) / <alpha-value>)',
        'chip-marigold-fg': 'rgb(var(--chip-marigold-fg-rgb) / <alpha-value>)',
        'chip-teal': 'rgb(var(--chip-teal-bg-rgb) / <alpha-value>)',
        'chip-teal-fg': 'rgb(var(--chip-teal-fg-rgb) / <alpha-value>)',
        'chip-rose': 'rgb(var(--chip-rose-bg-rgb) / <alpha-value>)',
        'chip-rose-fg': 'rgb(var(--chip-rose-fg-rgb) / <alpha-value>)',
        'chip-violet': 'rgb(var(--chip-violet-bg-rgb) / <alpha-value>)',
        'chip-violet-fg': 'rgb(var(--chip-violet-fg-rgb) / <alpha-value>)',
        'chart-indigo': 'var(--chart-indigo)',
        'chart-marigold': 'var(--chart-marigold)',
        'chart-teal': 'var(--chart-teal)',
        'chart-rose': 'var(--chart-rose)',
        'chart-violet': 'var(--chart-violet)',
        'chart-slate': 'var(--chart-slate)',
      },
      maxWidth: {
        // The product-page measure (dashboards, boards, tables). `max-w-reading`
        // (70ch) stays for text-first screens — auth, the setup wizard, error
        // pages — where a wide measure would hurt reading.
        page: 'var(--max-width-page)',
      },
      borderRadius: {
        input: 'var(--radius-input)',
        button: 'var(--radius-button)',
        card: 'var(--radius-card)',
        hero: 'var(--radius-hero-card)',
        sheet: 'var(--radius-sheet)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        1: 'var(--space-4)',
        2: 'var(--space-8)',
        3: 'var(--space-12)',
        4: 'var(--space-16)',
        5: 'var(--space-20)',
        6: 'var(--space-24)',
        8: 'var(--space-32)',
        10: 'var(--space-40)',
        14: 'var(--space-56)',
        20: 'var(--space-80)',
      },
      fontFamily: {
        sans: ['var(--font-ui)'],
        // Syne, per the prototype: h1–h4, logo, nav labels, page titles,
        // stat values and card titles.
        display: ['var(--font-display)'],
      },
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        md: 'var(--font-size-md)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      transitionDuration: {
        feedback: 'var(--duration-feedback)',
        reveal: 'var(--duration-reveal)',
        sheet: 'var(--duration-sheet)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
      zIndex: {
        sticky: 'var(--z-sticky)',
        dropdown: 'var(--z-dropdown)',
        sheet: 'var(--z-sheet)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
    },
  },
};

export default tokensPreset;
