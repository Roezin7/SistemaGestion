// src/theme.js
import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#111827';
const primaryDark = '#0b1220';
const accentMain = '#0f766e';
const surfaceMain = '#ffffff';
const inkMain = '#101828';
const mutedInk = '#475467';
const lineColor = alpha('#0f172a', 0.08);

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: '#344054',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#344054',
      dark: '#1d2939',
      light: '#98a2b3',
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
      default: '#f4f6f9',
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
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 800,
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
          background: 'linear-gradient(180deg, #f8fafc 0%, #f3f5f8 100%)',
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
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
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
        },
        containedPrimary: {
          background: primaryMain,
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
          height: 2,
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
          background: '#f8fafc',
          borderBottom: `1px solid ${lineColor}`,
        },
        body: {
          borderBottom: `1px solid ${lineColor}`,
          verticalAlign: 'middle',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover td': {
            backgroundColor: alpha(primaryMain, 0.018),
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
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
        },
      },
    },
  },
});

export default theme;
