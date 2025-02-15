// src/App.js
import React, { useState } from 'react';
import { Container, AppBar, Tabs, Tab, Box, Toolbar, Typography } from '@mui/material';
import Dashboard from './components/Dashboard';
import ClientesPage from './components/ClientesPage';
import FinanzasPage from './components/FinanzasPage';
import ReportesPage from './components/ReportesPage';
import { AccountCircle, Dashboard as DashboardIcon, AttachMoney, Assessment } from '@mui/icons-material';
import logo from './assets/newlogo.png'; // Nuevo logo principal
import leaderLogo from './assets/leaderlogo.png'; // Logo LEADER, con transparencia

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
  const [tabIndex, setTabIndex] = useState(0);

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <img src={logo} alt="Nuevo Logo" style={{ height: '120px', marginRight: '20px' }} />
          <Typography variant="h4" component="div" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}>
            Sistema de Gestión de Trámites Migratorios
          </Typography>
        </Toolbar>
        <Tabs value={tabIndex} onChange={handleChange} variant="fullWidth">
          <Tab icon={<DashboardIcon />} label="Dashboard" {...a11yProps(0)} />
          <Tab icon={<AccountCircle />} label="Clientes" {...a11yProps(1)} />
          <Tab icon={<AttachMoney />} label="Finanzas" {...a11yProps(2)} />
          <Tab icon={<Assessment />} label="Reportes" {...a11yProps(3)} />
        </Tabs>
      </AppBar>

      <Box sx={{ flex: 1 }}>
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

      {/* Footer con logo LEADER */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <img
          src={leaderLogo}
          alt="LEADER Logo"
          style={{
            opacity: 0.3,
            maxHeight: '30px',
          }}
        />
      </Box>
    </Container>
  );
}

export default App;
