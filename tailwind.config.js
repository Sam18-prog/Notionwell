/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bgApp: 'var(--bg-app)',
        surface: 'var(--surface)',
        surfaceElevated: 'var(--surface-elevated)',
        surfaceHover: 'var(--surface-hover)',

        brandPrimary: 'var(--primary)',
        brandPrimaryHover: 'var(--primary-hover)',
        brandPrimarySoft: 'var(--primary-soft)',

        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        textMuted: 'var(--text-[#64748B])',

        borderColor: 'var(--border)',
        borderStrong: 'var(--border-strong)',

        success: 'var(--success)',
        successSoft: 'var(--success-soft)',

        warning: 'var(--warning)',
        warningSoft: 'var(--warning-soft)',

        danger: 'var(--danger)',
        dangerSoft: 'var(--danger-soft)',

        info: 'var(--info)',
        infoSoft: 'var(--info-soft)',
      },
    },
  },
  plugins: [],
}
