import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  MenuItem,
  Paper,
  Select,
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
import AdminOficinasModal from './components/AdminOficinasModal';
import api from './services/api';
import logo from './assets/newlogo.png';
import leaderLogo from './assets/leaderlogo.png';
import { clearAuthSession, readStoredUser, saveAuthSession } from './utils/session';

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
  const [sessionLoading, setSessionLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openAdminUsuarios, setOpenAdminUsuarios] = useState(false);
  const [openAdminOficinas, setOpenAdminOficinas] = useState(false);
  const [switchingOffice, setSwitchingOffice] = useState(false);
  const [scopeKey, setScopeKey] = useState(0);

  const hydrateSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = readStoredUser();

    if (!storedToken || !storedUser) {
      setUser(null);
      setIsAuthenticated(false);
      setSessionLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      saveAuthSession(response.data);
      setUser(readStoredUser());
      setIsAuthenticated(true);
    } catch (error) {
      console.error('No se pudo restaurar la sesión:', error);
      clearAuthSession();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const handleAdminOption = (option) => {
    if (option === 'historial') {
      setOpenHistorial(true);
    } else if (option === 'usuarios') {
      setOpenAdminUsuarios(true);
    } else if (option === 'oficinas') {
      setOpenAdminOficinas(true);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setIsAuthenticated(false);
    setTabIndex(0);
    setScopeKey(0);
  };

  const handleOfficeSwitch = async (event) => {
    const oficinaId = event.target.value;
    if (!oficinaId || Number(oficinaId) === Number(user?.oficinaId)) {
      return;
    }

    setSwitchingOffice(true);
    try {
      const response = await api.post('/api/auth/switch-office', { oficinaId });
      saveAuthSession(response.data);
      setUser(readStoredUser());
      setScopeKey((current) => current + 1);
      setOpenHistorial(false);
      setOpenAdminUsuarios(false);
      setOpenAdminOficinas(false);
    } catch (error) {
      console.error('Error al cambiar de oficina:', error);
      await hydrateSession();
    } finally {
      setSwitchingOffice(false);
    }
  };

  if (!isAuthenticated) {
    if (sessionLoading) {
      return (
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <LoginPage
        onLoginSuccess={() => {
          setSessionLoading(true);
          hydrateSession();
        }}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, md: 2.5 },
            mb: 3,
            background: 'linear-gradient(180deg, rgba(36,93,156,0.05) 0%, rgba(255,255,255,0.98) 36%)',
          }}
        >
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
                    backgroundColor: 'rgba(36, 93, 156, 0.08)',
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

              <Tabs
                value={tabIndex}
                onChange={(_, newIndex) => setTabIndex(newIndex)}
                aria-label="tabs"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ width: '100%' }}
              >
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
                  minWidth: { xs: '100%', sm: 280 },
                  width: { xs: '100%', sm: 'auto' },
                  backgroundColor: 'rgba(36, 93, 156, 0.05)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sesión activa
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, color: 'text.primary' }}>
                  {user?.username} · {user?.rol}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={String(user?.oficinaId || '')}
                      onChange={handleOfficeSwitch}
                      disabled={switchingOffice}
                    >
                      {(user?.oficinas || []).map((oficina) => (
                        <MenuItem key={oficina.id} value={String(oficina.id)}>
                          {oficina.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {switchingOffice ? <CircularProgress size={18} /> : null}
                </Stack>
              </Paper>
              {user?.rol === 'admin' ? <AdminBanner onSelectOption={handleAdminOption} /> : null}
              <Button variant="outlined" onClick={handleLogout} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                Cerrar sesión
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box key={`${user?.userId || 'anon'}-${user?.oficinaId || 'sin-oficina'}-${scopeKey}`}>
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
        </Box>

        <HistorialModal open={openHistorial} onClose={() => setOpenHistorial(false)} />
        <AdminUsuariosModal
          open={openAdminUsuarios}
          onClose={() => setOpenAdminUsuarios(false)}
          onSessionUpdated={hydrateSession}
        />
        <AdminOficinasModal
          open={openAdminOficinas}
          onClose={() => setOpenAdminOficinas(false)}
          onSessionUpdated={hydrateSession}
        />

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
