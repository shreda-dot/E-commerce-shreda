import { createTheme } from '@mui/material/styles';

export function buildTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? '#7dd3fc' : '#0284c7' },
      secondary: { main: isDark ? '#f9a8d4' : '#db2777' },
      background: {
        default: isDark ? '#1a1028' : '#fff7fb',
        paper: isDark ? '#2a1b3d' : '#ffffff'
      }
    },
    shape: {
      borderRadius: 14
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif'
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? 'linear-gradient(90deg, rgba(125,211,252,0.18), rgba(249,168,212,0.16))'
              : 'linear-gradient(90deg, rgba(2,132,199,0.12), rgba(219,39,119,0.1))'
          }
        }
      }
    }
  });
}
