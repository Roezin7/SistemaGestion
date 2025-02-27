import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';

const RegisterPopup = ({ open, onClose, onRegisterSuccess }) => {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, { nombre, username, password });
      if (response.data.success) {
        onRegisterSuccess();
        onClose();
      }
    } catch (err) {
      setError('Error en el registro');
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400, bgcolor: 'background.paper',
          borderRadius: 2, boxShadow: 24, p: 4,
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          Registro de Usuario
        </Typography>
        {error && <Typography color="error">{error}</Typography>}
        <TextField
          label="Nombre"
          fullWidth
          margin="normal"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <TextField
          label="Username"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Box mt={2}>
          <Button variant="contained" color="primary" fullWidth onClick={handleRegister}>
            Registrarse
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default RegisterPopup;
