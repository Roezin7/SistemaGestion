import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
import { readStoredUser } from '../utils/session';

const ROLES = ['admin', 'gerente', 'empleado'];

const AdminUsuariosModal = ({ open, onClose, onSessionUpdated }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [editingOfficeIds, setEditingOfficeIds] = useState([]);
  const [openRegister, setOpenRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentUser = readStoredUser();

  const fetchUsuarios = useCallback(() => {
    setLoading(true);
    setError('');

    Promise.all([
      api.get('/api/auth/usuarios'),
      api.get('/api/auth/oficinas'),
    ])
      .then(([usuariosResponse, oficinasResponse]) => {
        setUsuarios(usuariosResponse.data || []);
        setOficinas(oficinasResponse.data || []);
      })
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
    () => usuarios[0]?.oficina_actual_nombre || currentUser?.oficina || 'Oficina actual',
    [usuarios, currentUser]
  );

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setNewRole(user.rol);
    setEditingOfficeIds((user.oficinas || []).map((oficina) => oficina.id));
  };

  const handleSave = (userId) => {
    api.put(`/api/auth/usuarios/${userId}`, {
      rol: newRole,
      oficinaIds: editingOfficeIds,
    })
      .then(() => {
        fetchUsuarios();
        onSessionUpdated?.();
        setEditingUserId(null);
        setNewRole('');
        setEditingOfficeIds([]);
      })
      .catch((saveError) => {
        console.error('Error al actualizar usuario:', saveError);
        setError(saveError.response?.data?.message || 'No se pudo actualizar el usuario.');
      });
  };

  const handleDelete = (userId) => {
    api.delete(`/api/auth/usuarios/${userId}`)
      .then(() => {
        fetchUsuarios();
        onSessionUpdated?.();
      })
      .catch((deleteError) => {
        console.error('Error al eliminar acceso de usuario:', deleteError);
        setError(deleteError.response?.data?.message || 'No se pudo eliminar el acceso del usuario.');
      });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
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
                Administra la oficina activa y decide qué usuarios pueden cambiar entre sedes.
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
                  <TableCell>Oficinas con acceso</TableCell>
                  <TableCell>Alta</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
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
                    <TableCell sx={{ minWidth: 160 }}>
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
                    <TableCell sx={{ minWidth: 260 }}>
                      {editingUserId === user.id ? (
                        <Autocomplete
                          multiple
                          options={oficinas}
                          size="small"
                          value={oficinas.filter((oficina) => editingOfficeIds.includes(oficina.id))}
                          getOptionLabel={(option) => option.nombre}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          onChange={(_, selected) => {
                            setEditingOfficeIds(selected.map((option) => option.id));
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Selecciona oficinas"
                            />
                          )}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {(user.oficinas || []).map((oficina) => oficina.nombre).join(', ') || 'Sin oficinas'}
                        </Typography>
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
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleSave(user.id)}
                            disabled={!editingOfficeIds.length}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingUserId(null);
                              setNewRole('');
                              setEditingOfficeIds([]);
                            }}
                          >
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
          onRegisterSuccess={() => {
            fetchUsuarios();
            onSessionUpdated?.();
          }}
          showRoleSelector
        />
      </DialogContent>
    </Dialog>
  );
};

export default AdminUsuariosModal;
