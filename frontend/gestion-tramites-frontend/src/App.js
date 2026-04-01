import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  AccountCircle,
  Assessment,
  AttachMoney,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import Dashboard from './components/Dashboard';
import ClientesPage from './components/ClientesPage';
import FinanzasPage from './components/FinanzasPage';
import ReportesPage from './components/ReportesPage';
import LoginPage from './components/LoginPage';
import AdminBanner from './components/AdminBanner';
import HistorialModal from './components/HistorialModal';
import AdminUsuariosModal from './components/AdminUsuariosModal';
import logo from './assets/newlogo.png';
import leaderLogo from './assets/leaderlogo.png';

function a11yProps(index) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`}>
      {value === index && children}
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openAdminUsuarios, setOpenAdminUsuarios] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminOption = (option) => {
    if (option === 'historial') {
      setOpenHistorial(true);
    } else if (option === 'usuarios') {
      setOpenAdminUsuarios(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setUser(null);
    setIsAuthenticated(false);
    setTabIndex(0);
  };

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          if (storedToken && storedUser) {
            setUser(JSON.parse(storedUser));
          }
          setIsAuthenticated(Boolean(storedToken && storedUser));
        }}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 8,
            mb: 3,
            px: { xs: 2.5, md: 4 },
            py: { xs: 2.5, md: 3.5 },
            background:
              'linear-gradient(135deg, rgba(9,59,69,0.95), rgba(13,94,111,0.92) 52%, rgba(197,140,69,0.82) 140%)',
            color: '#ffffff',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at top right, rgba(255,255,255,0.20), transparent 28%), radial-gradient(circle at bottom left, rgba(255,255,255,0.10), transparent 32%)',
              pointerEvents: 'none',
            }}
          />
          <AppBar position="static">
            <Toolbar disableGutters sx={{ px: 0, minHeight: 'unset !important' }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                sx={{ width: '100%' }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 68,
                      height: 68,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      display: 'grid',
                      placeItems: 'center',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <img src={logo} alt="Logo" style={{ height: 50 }} />
                  </Box>
                  <Box>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.82)', letterSpacing: '0.18em' }}>
                      PANEL OPERATIVO
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#ffffff', mt: 0.5 }}>
                      Sistema de Gestión de Trámites Migratorios
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.75 }}>
                      Control diario de clientes, documentación, finanzas y reportes del equipo.
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 2,
                      py: 1.25,
                      minWidth: 200,
                      backgroundColor: 'rgba(255,255,255,0.14)',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.16)',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.74)' }}>
                      Sesión activa
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 700 }}>
                      {user?.username} · {user?.rol}
                    </Typography>
                  </Paper>
                  {user?.rol === 'admin' ? <AdminBanner onSelectOption={handleAdminOption} /> : null}
                  <Button variant="outlined" color="inherit" onClick={handleLogout} sx={{ borderColor: 'rgba(255,255,255,0.24)' }}>
                    Cerrar sesión
                  </Button>
                </Stack>
              </Stack>
            </Toolbar>
          </AppBar>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 1, md: 1.5 },
            mb: 3,
            border: '1px solid rgba(9,59,69,0.08)',
            backgroundColor: 'rgba(255,253,248,0.88)',
          }}
        >
          <Tabs value={tabIndex} onChange={(_, newIndex) => setTabIndex(newIndex)} aria-label="tabs" variant="scrollable">
            <Tab label="Dashboard" icon={<DashboardIcon />} iconPosition="start" {...a11yProps(0)} />
            <Tab label="Clientes" icon={<AccountCircle />} iconPosition="start" {...a11yProps(1)} />
            <Tab label="Finanzas" icon={<AttachMoney />} iconPosition="start" {...a11yProps(2)} />
            <Tab label="Reportes" icon={<Assessment />} iconPosition="start" {...a11yProps(3)} />
          </Tabs>
        </Paper>

        <TabPanel value={tabIndex} index={0}>
          <Dashboard />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <ClientesPage />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <FinanzasPage />
        </TabPanel>
        <TabPanel value={tabIndex} index={3}>
          <ReportesPage />
        </TabPanel>

        <HistorialModal open={openHistorial} onClose={() => setOpenHistorial(false)} />
        <AdminUsuariosModal open={openAdminUsuarios} onClose={() => setOpenAdminUsuarios(false)} />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{
            mt: 4,
            px: 1,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            Plataforma de operación interna para seguimiento migratorio, control documental y finanzas.
          </Typography>
          <img src={leaderLogo} alt="LEADER" style={{ height: 18 }} />
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
