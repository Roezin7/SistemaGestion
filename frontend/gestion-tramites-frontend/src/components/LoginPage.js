// src/components/LoginPage.js
import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import axios from 'axios';

const LoginPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      // Se modifica la URL para apuntar directamente al backend en el puerto 5000
      const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      if (response.data.success) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={8} p={4} boxShadow={3}>
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
