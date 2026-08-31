import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e40af',   // blue-800 — used for primary actions / nav active
      light: '#3b82f6',
      dark: '#1e3a8a',
    },
    secondary: {
      main: '#374151',   // grey-700 — neutral secondary actions
    },
    background: {
      default: '#f1f5f9', // slate-100 — page bg
      paper: '#ffffff',
    },
    success: { main: '#16a34a' },  // SLA ok — green-600
    warning: { main: '#d97706' },  // SLA at_risk — amber-600
    error:   { main: '#dc2626' },  // SLA breached — red-600
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    divider: '#e5e7eb',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    fontSize: 13,
    h5: { fontWeight: 700, fontSize: '1.25rem' },
    h6: { fontWeight: 700, fontSize: '1rem' },
    subtitle2: { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem', color: '#6b7280' },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        *, *::before, *::after { box-sizing: border-box; }
      `,
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#111827' },
      },
    },
    MuiToolbar: {
      defaultProps: { variant: 'dense' },
      styleOverrides: { dense: { minHeight: 52 } },
    },
    MuiButton: {
      defaultProps: { size: 'small', disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, fontSize: '0.8125rem' },
        contained: { fontWeight: 600 },
      },
    },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.7rem', height: 20 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: '6px 12px', fontSize: '0.8125rem' },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#6b7280',
          backgroundColor: '#f8fafc',
          borderBottom: '2px solid #e5e7eb',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
    MuiFormControl: {
      defaultProps: { size: 'small' },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #e5e7eb' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { border: '1px solid #e5e7eb' },
      },
    },
    MuiDialog: {
      defaultProps: { maxWidth: 'sm', fullWidth: true },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: '1rem', fontWeight: 700, paddingBottom: 8 },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: { paddingTop: 4, paddingBottom: 4 },
      },
    },
    MuiAlert: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: { minHeight: 44 },
        displayedRows: { fontSize: '0.8rem' },
        selectLabel: { fontSize: '0.8rem' },
      },
    },
  },
});

export default theme;
