import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../services/api';

const ROLES = ['admin', 'gerente', 'empleado'];
const OFICINA_NUEVA = '__nueva__';

function resetFields(setters) {
  setters.setNombre('');
  setters.setUsername('');
  setters.setPassword('');
  setters.setRol('empleado');
  setters.setOficinaId('');
  setters.setOficinaNombre('');
  setters.setError('');
}

const RegisterPopup = ({ open, onClose, onRegisterSuccess, showRoleSelector = false }) => {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('empleado');
  const [oficinas, setOficinas] = useState([]);
  const [oficinaId, setOficinaId] = useState('');
  const [oficinaNombre, setOficinaNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    api.get('/api/auth/oficinas')
      .then((response) => setOficinas(response.data || []))
      .catch((err) => {
        console.error('Error al cargar oficinas:', err);
        setOficinas([]);
      });
  }, [open]);

  useEffect(() => {
    if (open && !showRoleSelector && !oficinaNombre) {
      setOficinaNombre('Oficina principal');
    }
  }, [open, showRoleSelector, oficinaNombre]);

  const handleClose = () => {
    resetFields({
      setNombre,
      setUsername,
      setPassword,
      setRol,
      setOficinaId,
      setOficinaNombre,
      setError,
    });
    onClose();
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      if (oficinaId === OFICINA_NUEVA && !oficinaNombre.trim()) {
        setError('Escribe el nombre de la nueva oficina.');
        return;
      }

      const payload = {
        nombre,
        username,
        password,
        oficinaId: oficinaId && oficinaId !== OFICINA_NUEVA ? oficinaId : undefined,
        oficinaNombre: (oficinaId === OFICINA_NUEVA || (!showRoleSelector && !oficinaId))
          ? oficinaNombre
          : undefined,
      };

      if (showRoleSelector) {
        payload.rol = rol;
      }

      const response = await api.post('/api/auth/register', payload);
      if (response.data.success) {
        resetFields({
          setNombre,
          setUsername,
          setPassword,
          setRol,
          setOficinaId,
          setOficinaNombre,
          setError,
        });
        onRegisterSuccess(response.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const usandoNuevaOficina = oficinaId === OFICINA_NUEVA || (!showRoleSelector && !oficinaId);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{showRoleSelector ? 'Crear usuario' : 'Registro inicial del sistema'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {showRoleSelector
              ? 'Cada usuario inicia con una oficina principal. Si después necesitas que cambie entre varias, puedes darle acceso adicional desde la administración de usuarios.'
              : 'Configura el usuario administrador inicial y la oficina principal de la operación.'}
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Nombre"
            fullWidth
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <TextField
            label="Usuario"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Mínimo 10 caracteres, con mayúsculas, minúsculas y números."
          />

          {showRoleSelector ? (
            <TextField
              select
              label="Rol"
              fullWidth
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <TextField
            select
            label="Oficina"
            fullWidth
            value={oficinaId}
            onChange={(e) => {
              setOficinaId(e.target.value);
              if (e.target.value !== OFICINA_NUEVA) {
                setOficinaNombre('');
              }
            }}
            helperText="Selecciona una oficina existente o crea una nueva."
          >
            {showRoleSelector ? <MenuItem value="">Usar mi oficina actual</MenuItem> : null}
            {oficinas.map((oficina) => (
              <MenuItem key={oficina.id} value={String(oficina.id)}>
                {oficina.nombre}
              </MenuItem>
            ))}
            <MenuItem value={OFICINA_NUEVA}>Crear nueva oficina</MenuItem>
          </TextField>

          {usandoNuevaOficina ? (
            <TextField
              label="Nombre de la oficina"
              fullWidth
              value={oficinaNombre}
              onChange={(e) => setOficinaNombre(e.target.value)}
              helperText="Si no existe, el sistema la crea y asigna el usuario a esa oficina."
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleRegister} disabled={loading}>
          {loading ? 'Guardando...' : showRoleSelector ? 'Crear usuario' : 'Crear usuario inicial'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegisterPopup;
