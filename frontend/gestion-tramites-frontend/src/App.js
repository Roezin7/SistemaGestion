// src/App.js
import React, { useState, useEffect } from 'react';
import { Container, AppBar, Tabs, Tab, Box, Toolbar, Typography } from '@mui/material';
import Dashboard from './components/Dashboard';
import ClientesPage from './components/ClientesPage';
import FinanzasPage from './components/FinanzasPage';
import ReportesPage from './components/ReportesPage';
import LoginPage from './components/LoginPage';
import AdminBanner from './components/AdminBanner';
import { AccountCircle, Dashboard as DashboardIcon, AttachMoney, Assessment } from '@mui/icons-material';
import logo from './assets/newlogo.png';
import leaderLogo from './assets/leaderlogo.png';

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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleTabChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  const handleAdminOption = (option) => {
    if (option === 'historial') {
      // Aquí puedes abrir un modal o navegar a una página que muestre el historial de cambios totales en el sistema
      alert("Mostrar Historial de Cambios del Sistema");
    } else if (option === 'usuarios') {
      // Aquí puedes abrir una página o modal para administrar usuarios (agregar, eliminar, modificar roles)
      alert("Mostrar Administración de Usuarios y Roles");
    }
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
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Sistema de Gestión de Trámites Migratorios
          </Typography>
          {/* Si el usuario es administrador, mostramos el menú adicional */}
          {user && user.rol === 'admin' && (
            <AdminBanner onSelectOption={handleAdminOption} />
          )}
          <img src={leaderLogo} alt="LEADER" style={{ height: 20 }} />
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
    </Container>
  );
}

export default App;
