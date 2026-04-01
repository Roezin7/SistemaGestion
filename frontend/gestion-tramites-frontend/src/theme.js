// src/theme.js
import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#0d5e6f';
const primaryDark = '#093b45';
const accentMain = '#c58c45';
const surfaceMain = '#fffdf8';
const inkMain = '#16313b';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: '#5e99a6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: accentMain,
      dark: '#8b5a1e',
      light: '#f0c58e',
      contrastText: '#ffffff',
    },
    success: {
      main: '#3d7d5b',
    },
    error: {
      main: '#b6504f',
    },
    warning: {
      main: '#bf8a2c',
    },
    background: {
      default: '#f4f0e8',
      paper: surfaceMain,
    },
    text: {
      primary: inkMain,
      secondary: '#61707b',
    },
    divider: alpha(primaryDark, 0.08),
  },
  shape: {
    borderRadius: 22,
  },
  typography: {
    fontFamily: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
    h3: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h4: {
      fontSize: '1.6rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.15rem',
      fontWeight: 800,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 800,
    },
    body1: {
      lineHeight: 1.7,
    },
    button: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            'radial-gradient(circle at top left, rgba(197,140,69,0.18), transparent 28%), radial-gradient(circle at top right, rgba(13,94,111,0.16), transparent 26%), linear-gradient(180deg, #f8f3ea 0%, #f2ede4 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          background: 'transparent',
          color: inkMain,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: 'none',
          border: `1px solid ${alpha(primaryDark, 0.08)}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '10px 18px',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${primaryMain}, ${primaryDark})`,
        },
        outlined: {
          borderColor: alpha(primaryMain, 0.22),
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 58,
        },
        indicator: {
          height: '100%',
          borderRadius: 999,
          background: alpha(primaryMain, 0.12),
          zIndex: 0,
        },
        flexContainer: {
          gap: 8,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 50,
          borderRadius: 999,
          fontWeight: 800,
          color: '#52616c',
          zIndex: 1,
          '&.Mui-selected': {
            color: primaryDark,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#ffffff', 0.86),
          borderRadius: 18,
          '& fieldset': {
            borderColor: alpha(primaryDark, 0.12),
          },
          '&:hover fieldset': {
            borderColor: alpha(primaryMain, 0.26),
          },
          '&.Mui-focused fieldset': {
            borderWidth: 1,
            borderColor: primaryMain,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 800,
          color: '#f6efe3',
          background: `linear-gradient(135deg, ${primaryDark}, ${primaryMain})`,
          borderBottom: 'none',
        },
        body: {
          borderBottom: `1px solid ${alpha(primaryDark, 0.08)}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(even) td': {
            backgroundColor: alpha(primaryMain, 0.02),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
