function withOpacity(variableName) {
  return ({ opacityValue }) =>
    opacityValue === undefined ? `rgb(var(${variableName}))` : `rgb(var(${variableName}) / ${opacityValue})`;
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Noto Sans Bengali', 'Segoe UI Variable', 'Segoe UI', 'Avenir Next', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 50px rgba(15, 23, 42, 0.08)',
      },
      colors: {
        slate: {
          50: withOpacity('--slate-50'), 100: withOpacity('--slate-100'), 200: withOpacity('--slate-200'),
          300: withOpacity('--slate-300'), 400: withOpacity('--slate-400'), 500: withOpacity('--slate-500'),
          600: withOpacity('--slate-600'), 700: withOpacity('--slate-700'), 800: withOpacity('--slate-800'),
          900: withOpacity('--slate-900'), 950: withOpacity('--slate-950'),
        },
        blue: {
          50: withOpacity('--blue-50'), 100: withOpacity('--blue-100'), 200: withOpacity('--blue-200'),
          300: withOpacity('--blue-300'), 400: withOpacity('--blue-400'), 500: withOpacity('--blue-500'),
          600: withOpacity('--blue-600'), 700: withOpacity('--blue-700'), 800: withOpacity('--blue-800'),
          900: withOpacity('--blue-900'), 950: withOpacity('--blue-950'),
        },
        emerald: {
          50: withOpacity('--emerald-50'), 100: withOpacity('--emerald-100'), 200: withOpacity('--emerald-200'),
          300: withOpacity('--emerald-300'), 400: withOpacity('--emerald-400'), 500: withOpacity('--emerald-500'),
          600: withOpacity('--emerald-600'), 700: withOpacity('--emerald-700'), 800: withOpacity('--emerald-800'),
          900: withOpacity('--emerald-900'), 950: withOpacity('--emerald-950'),
        },
        amber: {
          50: withOpacity('--amber-50'), 100: withOpacity('--amber-100'), 200: withOpacity('--amber-200'),
          300: withOpacity('--amber-300'), 400: withOpacity('--amber-400'), 500: withOpacity('--amber-500'),
          600: withOpacity('--amber-600'), 700: withOpacity('--amber-700'), 800: withOpacity('--amber-800'),
          900: withOpacity('--amber-900'), 950: withOpacity('--amber-950'),
        },
        indigo: {
          50: withOpacity('--indigo-50'), 100: withOpacity('--indigo-100'), 200: withOpacity('--indigo-200'),
          300: withOpacity('--indigo-300'), 400: withOpacity('--indigo-400'), 500: withOpacity('--indigo-500'),
          600: withOpacity('--indigo-600'), 700: withOpacity('--indigo-700'), 800: withOpacity('--indigo-800'),
          900: withOpacity('--indigo-900'), 950: withOpacity('--indigo-950'),
        },
        teal: {
          50: withOpacity('--teal-50'), 100: withOpacity('--teal-100'), 200: withOpacity('--teal-200'),
          300: withOpacity('--teal-300'), 400: withOpacity('--teal-400'), 500: withOpacity('--teal-500'),
          600: withOpacity('--teal-600'), 700: withOpacity('--teal-700'), 800: withOpacity('--teal-800'),
          900: withOpacity('--teal-900'), 950: withOpacity('--teal-950'),
        },
        white: withOpacity('--white'),
        black: withOpacity('--black'),
        brand: {
          DEFAULT: 'var(--brand)',
          strong: 'var(--brand-strong)',
          soft: 'var(--brand-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          strong: 'var(--success-strong)',
          soft: 'var(--success-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          strong: 'var(--danger-strong)',
          soft: 'var(--danger-soft)',
        },
        ink: {
          DEFAULT: 'var(--text-strong)',
          soft: 'var(--text-soft)',
        },
        muted: 'var(--muted)',
        surface: {
          DEFAULT: 'var(--surface)',
          white: 'var(--surface-white)',
        },
      },
    },
  },
  plugins: [],
};
