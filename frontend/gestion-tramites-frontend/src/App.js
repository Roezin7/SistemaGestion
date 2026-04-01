import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
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
    <Box sx={{ minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 3 }}>
          <Stack
            direction={{ xs: 'column', xl: 'row' }}
            spacing={2.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', xl: 'center' }}
          >
            <Stack spacing={2} sx={{ flex: 1, width: '100%' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3,
                    backgroundColor: 'rgba(17, 24, 39, 0.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img src={logo} alt="Logo" style={{ height: 36 }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 700,
                    }}
                  >
                    Casa Blanca
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 0.5 }}>
                    Sistema de gestión migratoria
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Operación diaria, expedientes, documentos y control financiero.
                  </Typography>
                </Box>
              </Stack>

              <Tabs value={tabIndex} onChange={(_, newIndex) => setTabIndex(newIndex)} aria-label="tabs" variant="scrollable">
                <Tab label="Dashboard" icon={<DashboardIcon />} iconPosition="start" {...a11yProps(0)} />
                <Tab label="Clientes" icon={<AccountCircle />} iconPosition="start" {...a11yProps(1)} />
                <Tab label="Finanzas" icon={<AttachMoney />} iconPosition="start" {...a11yProps(2)} />
                <Tab label="Reportes" icon={<Assessment />} iconPosition="start" {...a11yProps(3)} />
              </Tabs>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ width: { xs: '100%', xl: 'auto' } }}
            >
              <Paper
                elevation={0}
                sx={{
                  px: 1.75,
                  py: 1.25,
                  minWidth: 220,
                  backgroundColor: '#f8fafc',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sesión activa
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, color: 'text.primary' }}>
                  {user?.username} · {user?.rol}
                </Typography>
              </Paper>
              {user?.rol === 'admin' ? <AdminBanner onSelectOption={handleAdminOption} /> : null}
              <Button variant="outlined" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </Stack>
          </Stack>
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
            px: 0.5,
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            Plataforma interna para seguimiento migratorio, documentación y finanzas.
          </Typography>
          <img src={leaderLogo} alt="LEADER" style={{ height: 18 }} />
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
