import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, MenuItem } from '@mui/material';
import api from '../services/api';

const RegisterPopup = ({ open, onClose, onRegisterSuccess, showRoleSelector = false }) => {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('empleado');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    try {
      const payload = showRoleSelector
        ? { nombre, username, password, rol }
        : { nombre, username, password };
      const response = await api.post('/api/auth/register', payload);
      if (response.data.success) {
        setNombre('');
        setUsername('');
        setPassword('');
        setRol('empleado');
        setError('');
        onRegisterSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
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
        {showRoleSelector && (
          <TextField
            select
            label="Rol"
            fullWidth
            margin="normal"
            value={rol}
            onChange={(e) => setRol(e.target.value)}
          >
            <MenuItem value="admin">admin</MenuItem>
            <MenuItem value="gerente">gerente</MenuItem>
            <MenuItem value="empleado">empleado</MenuItem>
          </TextField>
        )}
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
