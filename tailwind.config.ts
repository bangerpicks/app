import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'midnight-violet': '#240830',
        'lime-yellow': '#daff00',
        'ivory': '#fdfff0',
        'cinnabar': '#ee4136',
        'amber-glow': '#ff9b00',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slot-reveal': {
          '0%': { opacity: '0', transform: 'scale(0.5) rotate(-12deg)' },
          '60%': { opacity: '1', transform: 'scale(1.15) rotate(3deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'jackpot-glow-gold': {
          '0%, 100%': { boxShadow: '0 0 6px #ff9b00, 0 0 10px rgba(255, 155, 0, 0.4)' },
          '50%': { boxShadow: '0 0 12px #ff9b00, 0 0 20px rgba(255, 155, 0, 0.6)' },
        },
        'jackpot-glow-silver': {
          '0%, 100%': { boxShadow: '0 0 6px #fdfff0, 0 0 10px rgba(253, 255, 240, 0.3)' },
          '50%': { boxShadow: '0 0 12px #fdfff0, 0 0 20px rgba(253, 255, 240, 0.5)' },
        },
        'jackpot-glow-bronze': {
          '0%, 100%': { boxShadow: '0 0 6px #cc7a00, 0 0 10px rgba(204, 122, 0, 0.4)' },
          '50%': { boxShadow: '0 0 12px #cc7a00, 0 0 20px rgba(204, 122, 0, 0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slot-reveal': 'slot-reveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'jackpot-glow-gold': 'jackpot-glow-gold 2s ease-in-out infinite',
        'jackpot-glow-silver': 'jackpot-glow-silver 2s ease-in-out infinite',
        'jackpot-glow-bronze': 'jackpot-glow-bronze 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
