/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        aegis: {
          bg:       '#04080f',
          surface:  '#080f1c',
          panel:    '#0c1625',
          border:   '#1a2d4a',
          accent:   '#00d4ff',
          warn:     '#f97316',
          critical: '#ef4444',
          safe:     '#22c55e',
          gold:     '#fbbf24',
          muted:    '#4a6080',
          text:     '#cbd5e1',
          textDim:  '#64748b',
        }
      },
      fontFamily: {
        display: ['"Orbitron"', 'monospace'],
        body:    ['"IBM Plex Mono"', 'monospace'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan':       'scanLine 5s linear infinite',
        'glow':       'glowPulse 2s ease-in-out infinite',
        'slide-in':   'slideIn 0.35s ease-out',
        'fade-up':    'fadeUp 0.45s ease-out',
      },
      keyframes: {
        scanLine:  { '0%':{ transform:'translateY(-100%)' }, '100%':{ transform:'translateY(100%)' } },
        glowPulse: { '0%,100%':{ opacity:'0.6' }, '50%':{ opacity:'1' } },
        slideIn:   { from:{ transform:'translateX(16px)', opacity:'0' }, to:{ transform:'translateX(0)', opacity:'1' } },
        fadeUp:    { from:{ transform:'translateY(10px)', opacity:'0' }, to:{ transform:'translateY(0)', opacity:'1' } },
      },
    },
  },
  plugins: [],
}
