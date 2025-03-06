import React, { useState, useEffect } from 'react';
import { Container, AppBar, Tabs, Tab, Box, Toolbar, Typography, Button } from '@mui/material';
import Dashboard from './components/Dashboard';
import ClientesPage from './components/ClientesPage';
import FinanzasPage from './components/FinanzasPage';
import ReportesPage from './components/ReportesPage';
import LoginPage from './components/LoginPage';
import AdminBanner from './components/AdminBanner';
import HistorialModal from './components/HistorialModal';
import AdminUsuariosModal from './components/AdminUsuariosModal';
import { AccountCircle, Dashboard as DashboardIcon, AttachMoney, Assessment } from '@mui/icons-material';
import logo from './assets/newlogo.png';
import leaderLogo from './assets/leaderlogo.png';

const AUTO_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutos en milisegundos

function a11yProps(index) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} {...other}>
      {value === index && <Box p={3}>{children}</Box>}
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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    // Función para verificar inactividad y cerrar sesión
    const checkInactivity = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      const now = Date.now();

      if (lastActivity && now - lastActivity > AUTO_LOGOUT_TIME) {
        handleLogout();
      }
    };

    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now());
    };

    // Iniciar la actividad al cargar la página
    updateActivity();

    // Revisar cada minuto si hay inactividad
    const interval = setInterval(checkInactivity, 60 * 1000);

    // Escuchar eventos de actividad del usuario
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  const handleAdminOption = (option) => {
    if (option === 'historial') {
      setOpenHistorial(true);
    } else if (option === 'usuarios') {
      setOpenAdminUsuarios(true);
    }
  };

  const handleLogout = () => {
    console.log("Cerrando sesión por inactividad...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <Container maxWidth="lg">
      <AppBar position="static">
        <Toolbar>
          <img src={logo} alt="Logo" style={{ height: 60, marginRight: 16 }} />
          <Typography variant="h6" style={{ flexGrow: 1 }} sx={{ fontWeight: 'bold' }}>
            Sistema de Gestión de Trámites Migratorios
          </Typography>
          {user && user.rol === 'admin' && (
            <AdminBanner onSelectOption={handleAdminOption} />
          )}
          <Button variant="outlined" color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>
      <Tabs value={tabIndex} onChange={handleTabChange} aria-label="tabs">
        <Tab label="Dashboard" icon={<DashboardIcon />} {...a11yProps(0)} />
        <Tab label="Clientes" icon={<AccountCircle />} {...a11yProps(1)} />
        <Tab label="Finanzas" icon={<AttachMoney />} {...a11yProps(2)} />
        <Tab label="Reportes" icon={<Assessment />} {...a11yProps(3)} />
      </Tabs>
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
      
      {/* Modales para administración */}
      <HistorialModal open={openHistorial} onClose={() => setOpenHistorial(false)} />
      <AdminUsuariosModal open={openAdminUsuarios} onClose={() => setOpenAdminUsuarios(false)} />

      {/* Footer con el logo LEADER */}
      <Box sx={{ mt: 4, textAlign: 'center', py: 2, borderTop: '1px solid #ccc' }}>
        <img src={leaderLogo} alt="LEADER" style={{ height: 20 }} />
      </Box>
    </Container>
  );
}

export default App;
