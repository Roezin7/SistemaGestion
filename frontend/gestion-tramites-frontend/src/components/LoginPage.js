import React, { useState, useEffect } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';
import logo from '../assets/newlogo.png';

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null); // Almacena el usuario autenticado

  useEffect(() => {
    // Revisar si hay una sesión activa
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = async () => {
    try {
      console.log("Enviando solicitud a:", `${API_URL}/api/auth/login`);
      const response = await axios.post(`${API_URL}/api/auth/login`, { username, password });

      if (response.data.success) {
        const { token, userId, username, rol } = response.data;
        
        // Guardar en localStorage
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
            <Box mt={2}>
              <Button variant="contained" color="secondary" fullWidth onClick={handleLogout}>
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
          </>
        )}
      </Box>
    </Container>
  );
};

export default LoginPage;