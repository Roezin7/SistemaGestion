import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import logo from '../assets/newlogo.png';
import RegisterPopup from './RegisterPopup'; // Nuevo componente para registro
import api from '../services/api';

const LoginPage = ({ onLoginSuccess, onShowHistorial, onShowAdminPanel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [openRegister, setOpenRegister] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }

    api.get('/api/auth/setup-status')
      .then(({ data }) => setSetupRequired(Boolean(data.setupRequired)))
      .catch(() => setSetupRequired(false));
  }, []);

  const handleLogin = async () => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      if (response.data.success) {
        const { token, userId, username, rol } = response.data;
        // Guardar token y datos del usuario en localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ userId, username, rol }));
        setUser({ userId, username, rol });
        onLoginSuccess();
      }
    } catch (err) {
      setError('Credenciales incorrectas');
      console.error("Error en login:", err.response ? err.response.data : err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    setUser(null);
  };

  return (
    <Container maxWidth="sm">
      <Box mt={8} p={4} boxShadow={3} textAlign="center">
        <img src={logo} alt="Logo" style={{ width: 150, marginBottom: 20 }} />
        {user ? (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              Bienvenido, {user.username}
            </Typography>
            <Typography variant="body1" align="center">
              Rol: {user.rol}
            </Typography>
            <Box mt={2} display="flex" flexDirection="column" gap={2}>
              <Button variant="contained" color="primary" fullWidth onClick={() => onShowHistorial?.()}>
                Ver Historial de Cambios
              </Button>
              {user.rol === 'admin' && (
                <Button variant="contained" color="secondary" fullWidth onClick={() => onShowAdminPanel?.()}>
                  Administrar Roles y Modificar Historial
                </Button>
              )}
              <Button variant="outlined" color="error" fullWidth onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              Iniciar Sesión
            </Typography>
            {error && (
              <Typography variant="body1" color="error">
                {error}
              </Typography>
            )}
            <TextField
              label="Usuario"
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              label="Contraseña"
              variant="outlined"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Box mt={2}>
              <Button variant="contained" color="primary" fullWidth onClick={handleLogin}>
                Iniciar Sesión
              </Button>
            </Box>
            {setupRequired && (
              <Box mt={2}>
                <Button variant="outlined" fullWidth onClick={() => setOpenRegister(true)}>
                  Crear usuario inicial
                </Button>
              </Box>
            )}
            <Box mt={2}>
            </Box>
          </>
        )}
      </Box>
      <RegisterPopup 
        open={openRegister} 
        onClose={() => setOpenRegister(false)} 
        onRegisterSuccess={() => {
          alert("Registro exitoso, ahora inicia sesión");
          setSetupRequired(false);
        }}
      />
    </Container>
  );
};

export default LoginPage;
