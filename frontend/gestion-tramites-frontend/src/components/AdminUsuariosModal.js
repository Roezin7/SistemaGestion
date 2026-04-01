import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RegisterPopup from './RegisterPopup';
import api from '../services/api';

const ROLES = ['admin', 'gerente', 'empleado'];

function obtenerOficinaActual() {
  try {
    return JSON.parse(localStorage.getItem('user'))?.oficina || '';
  } catch {
    return '';
  }
}

const AdminUsuariosModal = ({ open, onClose }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [openRegister, setOpenRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsuarios = useCallback(() => {
    setLoading(true);
    setError('');

    api.get('/api/auth/usuarios')
      .then((response) => setUsuarios(response.data))
      .catch((fetchError) => {
        console.error('Error al cargar usuarios:', fetchError);
        setError(fetchError.response?.data?.message || 'No se pudieron cargar los usuarios.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      fetchUsuarios();
    }
  }, [open, fetchUsuarios]);

  const oficinaNombre = useMemo(
    () => usuarios[0]?.oficina_nombre || obtenerOficinaActual() || 'Oficina actual',
    [usuarios]
  );

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setNewRole(user.rol);
  };

  const handleSave = (userId) => {
    api.put(`/api/auth/usuarios/${userId}`, { rol: newRole })
      .then(() => {
        fetchUsuarios();
        setEditingUserId(null);
        setNewRole('');
      })
      .catch((saveError) => {
        console.error('Error al actualizar rol:', saveError);
        setError(saveError.response?.data?.message || 'No se pudo actualizar el rol.');
      });
  };

  const handleDelete = (userId) => {
    api.delete(`/api/auth/usuarios/${userId}`)
      .then(() => fetchUsuarios())
      .catch((deleteError) => {
        console.error('Error al eliminar usuario:', deleteError);
        setError(deleteError.response?.data?.message || 'No se pudo eliminar el usuario.');
      });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Administración de usuarios</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Esta vista administra únicamente la oficina activa.
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {oficinaNombre}
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => setOpenRegister(true)}>
              Crear usuario
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Alta</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No hay usuarios registrados para esta oficina.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {usuarios.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {user.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {editingUserId === user.id ? (
                        <TextField
                          select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          size="small"
                          fullWidth
                        >
                          {ROLES.map((role) => (
                            <MenuItem key={role} value={role}>
                              {role}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Typography variant="body2">{user.rol}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Sin fecha'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {editingUserId === user.id ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button variant="contained" size="small" onClick={() => handleSave(user.id)}>
                            Guardar
                          </Button>
                          <Button variant="outlined" size="small" onClick={() => setEditingUserId(null)}>
                            Cancelar
                          </Button>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <IconButton onClick={() => handleEditClick(user)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(user.id)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>

        <RegisterPopup
          open={openRegister}
          onClose={() => setOpenRegister(false)}
          onRegisterSuccess={fetchUsuarios}
          showRoleSelector
        />
      </DialogContent>
    </Dialog>
  );
};

export default AdminUsuariosModal;
