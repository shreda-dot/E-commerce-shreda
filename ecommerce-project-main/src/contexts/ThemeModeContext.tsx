import { createContext, useContext, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

type ThemeModeContextType = {
  mode: 'light' | 'dark';
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('mui-mode');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'light';
  });

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('mui-mode', next);
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'light' ? '#0f766e' : '#2dd4bf' },
          secondary: { main: mode === 'light' ? '#d97706' : '#fb923c' },
          background: {
            default: mode === 'light' ? '#f8fafc' : '#0b1220',
            paper: mode === 'light' ? '#ffffff' : '#131c2f'
          }
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: '"Inter", "Segoe UI", sans-serif'
        }
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
}
