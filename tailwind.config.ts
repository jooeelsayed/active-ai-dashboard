import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['var(--font-tajawal)', 'var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#060810',
          900: '#0d1117',
          800: '#161b25',
          700: '#1e2535',
          600: '#252d3d',
          500: '#2d3748',
        },
        brand: {
          cyan: '#22d3ee',
          'cyan-dark': '#0891b2',
          'cyan-light': '#67e8f9',
          lime: '#a3e635',
          'lime-dark': '#84cc16',
          'lime-light': '#bef264',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #22d3ee 0%, #a3e635 100%)',
        'brand-gradient-r': 'linear-gradient(135deg, #a3e635 0%, #22d3ee 100%)',
        'navy-gradient': 'linear-gradient(180deg, #0d1117 0%, #060810 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(30,37,53,0.9) 0%, rgba(22,27,37,0.8) 100%)',
        'glow-cyan': 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)',
        'glow-lime': 'radial-gradient(circle, rgba(163,230,53,0.15) 0%, transparent 70%)',
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'slide-in-up': 'slideInUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'count-up': 'countUp 0.8s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0.4)' },
          '50%': { boxShadow: '0 0 20px 10px rgba(34,211,238,0.1)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34,211,238,0.3)',
        'glow-lime': '0 0 20px rgba(163,230,53,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
