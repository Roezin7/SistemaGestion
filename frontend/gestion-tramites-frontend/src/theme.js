// src/theme.js
import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#245d9c';
const primaryDark = '#183d6b';
const accentMain = '#0f766e';
const surfaceMain = '#ffffff';
const inkMain = '#101828';
const mutedInk = '#475467';
const lineColor = alpha(primaryMain, 0.12);

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: '#5f8ec2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#274260',
      dark: '#17293d',
      light: '#6b7f96',
      contrastText: '#ffffff',
    },
    success: {
      main: accentMain,
    },
    error: {
      main: '#b42318',
    },
    warning: {
      main: '#b54708',
    },
    background: {
      default: '#f2f6fb',
      paper: surfaceMain,
    },
    text: {
      primary: inkMain,
      secondary: mutedInk,
    },
    divider: lineColor,
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
    h3: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.03em',
      '@media (max-width:600px)': {
        fontSize: '1.65rem',
      },
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
      '@media (max-width:600px)': {
        fontSize: '1.28rem',
      },
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 800,
      '@media (max-width:600px)': {
        fontSize: '1rem',
      },
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 800,
    },
    body1: {
      lineHeight: 1.6,
      color: inkMain,
    },
    body2: {
      lineHeight: 1.55,
      color: mutedInk,
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
            'linear-gradient(180deg, rgba(36,93,156,0.07) 0%, rgba(248,250,252,0.92) 16%, #f2f6fb 100%)',
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
          borderRadius: 18,
          backgroundImage: 'none',
          border: `1px solid ${lineColor}`,
          boxShadow: '0 10px 24px rgba(24, 61, 107, 0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 10px 24px rgba(24, 61, 107, 0.06)',
          border: `1px solid ${lineColor}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '9px 16px',
          '@media (max-width:600px)': {
            minHeight: 42,
          },
        },
        containedPrimary: {
          background: `linear-gradient(180deg, ${primaryMain} 0%, ${primaryDark} 100%)`,
          '&:hover': {
            background: primaryDark,
          },
        },
        outlined: {
          borderColor: alpha(primaryMain, 0.14),
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 999,
          background: primaryMain,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 0,
          padding: '10px 8px 14px',
          marginRight: 20,
          fontWeight: 700,
          color: mutedInk,
          '@media (max-width:600px)': {
            marginRight: 12,
            padding: '8px 6px 12px',
            fontSize: '0.82rem',
          },
          '&.Mui-selected': {
            color: primaryMain,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: surfaceMain,
          borderRadius: 12,
          '& fieldset': {
            borderColor: lineColor,
          },
          '&:hover fieldset': {
            borderColor: alpha(primaryMain, 0.18),
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
          fontWeight: 700,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: mutedInk,
          background: alpha(primaryMain, 0.06),
          borderBottom: `1px solid ${lineColor}`,
          '@media (max-width:600px)': {
            fontSize: '0.68rem',
            padding: '10px 12px',
          },
        },
        body: {
          borderBottom: `1px solid ${lineColor}`,
          verticalAlign: 'middle',
          '@media (max-width:600px)': {
            padding: '12px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover td': {
            backgroundColor: alpha(primaryMain, 0.03),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 999,
          border: `1px solid ${lineColor}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderLeft: `1px solid ${lineColor}`,
          backgroundImage: 'none',
          boxShadow: '-12px 0 32px rgba(24, 61, 107, 0.10)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '24px 24px 8px',
          fontSize: '1.1rem',
          fontWeight: 800,
          color: inkMain,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 24px 0',
          '@media (max-width:600px)': {
            padding: '8px 16px 0',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
          '@media (max-width:600px)': {
            padding: '16px 16px 20px',
          },
        },
      },
    },
  },
});

export default theme;
