import { createTheme } from '@mui/material/styles';

/**
 * Typography system — premium retail feel (clean, minimal, high readability)
 *
 * Primary (headings, prices, CTAs): Montserrat — geometric, confident, brand-forward
 * Secondary (body, nav, descriptions): Open Sans — highly legible at small sizes (WCAG-friendly)
 *
 * Exact CSS font-family strings (use with fallbacks):
 * - Headings: "Montserrat", "Helvetica Neue", Helvetica, Arial, sans-serif
 * - Body:     "Open Sans", "Roboto", "Helvetica Neue", Arial, sans-serif
 *
 * Accessibility: body default 16px (1rem), line-height ≥ 1.5 on body text;
 * `display=swap` on Google Fonts avoids invisible text during load; pair with
 * sufficient contrast from palette (see MUI palette.text).
 */
export const FONT_HEADING =
  '"Montserrat", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const FONT_BODY =
  '"Open Sans", "Roboto", "Helvetica Neue", Arial, sans-serif';

export function buildTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? '#7dd3fc' : '#0284c7' },
      secondary: { main: isDark ? '#f9a8d4' : '#db2777' },
      background: {
        default: isDark ? '#1a1028' : '#fff7fb',
        paper: isDark ? '#2a1b3d' : '#ffffff',
      },
      text: {
        primary: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(18, 23, 42, 0.92)',
        secondary: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(18, 23, 42, 0.65)',
      },
    },
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily: FONT_BODY,
      /** H1 — hero / page title */
      h1: {
        fontFamily: FONT_HEADING,
        fontWeight: 800,
        fontSize: 'clamp(1.875rem, 1.35rem + 1.4vw, 2.75rem)',
        lineHeight: 1.12,
        letterSpacing: '-0.03em',
      },
      /** H2 — section titles */
      h2: {
        fontFamily: FONT_HEADING,
        fontWeight: 700,
        fontSize: 'clamp(1.5rem, 1.2rem + 0.9vw, 2.125rem)',
        lineHeight: 1.2,
        letterSpacing: '-0.025em',
      },
      /** H3 — cards, subsections */
      h3: {
        fontFamily: FONT_HEADING,
        fontWeight: 600,
        fontSize: 'clamp(1.25rem, 1.08rem + 0.45vw, 1.5rem)',
        lineHeight: 1.28,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontFamily: FONT_HEADING,
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.35,
        letterSpacing: '-0.015em',
      },
      h5: {
        fontFamily: FONT_HEADING,
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
      },
      h6: {
        fontFamily: FONT_HEADING,
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.45,
        letterSpacing: '-0.005em',
      },
      subtitle1: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
        letterSpacing: '0.01em',
      },
      subtitle2: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        fontSize: '0.875rem',
        lineHeight: 1.5,
        letterSpacing: '0.02em',
      },
      /** Primary body — 16px minimum for comfortable reading */
      body1: {
        fontFamily: FONT_BODY,
        fontWeight: 400,
        fontSize: '1rem',
        lineHeight: 1.65,
        letterSpacing: '0.01em',
      },
      /** Secondary body / captions — slightly smaller but still ≥15px for UI chrome */
      body2: {
        fontFamily: FONT_BODY,
        fontWeight: 400,
        fontSize: '0.9375rem',
        lineHeight: 1.55,
        letterSpacing: '0.015em',
      },
      /** Product prices, nav emphasis — matches retail “bold price” pattern */
      button: {
        fontFamily: FONT_HEADING,
        fontWeight: 600,
        fontSize: '0.9375rem',
        lineHeight: 1.5,
        letterSpacing: '0.04em',
        textTransform: 'none' as const,
      },
      caption: {
        fontFamily: FONT_BODY,
        fontWeight: 500,
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        letterSpacing: '0.02em',
      },
      overline: {
        fontFamily: FONT_BODY,
        fontWeight: 600,
        fontSize: '0.75rem',
        lineHeight: 1.6,
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: FONT_BODY,
            fontSize: '16px',
            lineHeight: 1.6,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          'input, textarea, select, button': {
            fontFamily: FONT_BODY,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: FONT_HEADING,
            fontWeight: 600,
            letterSpacing: '0.03em',
            textTransform: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? 'linear-gradient(90deg, rgba(125,211,252,0.18), rgba(249,168,212,0.16))'
              : 'linear-gradient(90deg, rgba(2,132,199,0.12), rgba(219,39,119,0.1))',
          },
        },
      },
    },
  });
}
