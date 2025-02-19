// src/components/LoginPage.js
import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config'; // ✅ Importar API_URL
import logo from '../assets/newlogo.png'; // Asegúrate de que el logo esté en src/assets/logo.png

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      console.log("Enviando solicitud a:", `${API_URL}/api/auth/login`); // 🔍 Debug
      const response = await axios.post(`${API_URL}/api/auth/login`, { username, password });
      if (response.data.success) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('Credenciales incorrectas');
      console.error("Error en login:", err.response ? err.response.data : err);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={8} p={4} boxShadow={3} textAlign="center">
        {/* Agregar el logo */}
        <img src={logo} alt="Logo" style={{ width: 150, marginBottom: 20 }} />

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
      </Box>
    </Container>
  );
};

export default LoginPage;
