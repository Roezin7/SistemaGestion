// src/components/AdminUsuariosModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Button, TextField, IconButton, MenuItem } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RegisterPopup from './RegisterPopup';
import api from '../services/api';

const ROLES = ['admin', 'gerente', 'empleado'];

const AdminUsuariosModal = ({ open, onClose }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [openRegister, setOpenRegister] = useState(false);

  const fetchUsuarios = useCallback(() => {
    api.get('/api/auth/usuarios')
      .then(response => setUsuarios(response.data))
      .catch(error => console.error('Error al cargar usuarios:', error));
  }, []);

  useEffect(() => {
    if (open) {
      fetchUsuarios();
    }
  }, [open, fetchUsuarios]);

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
      .catch(error => console.error('Error al actualizar rol:', error));
  };

  const handleDelete = (userId) => {
    api.delete(`/api/auth/usuarios/${userId}`)
      .then(() => fetchUsuarios())
      .catch(error => console.error('Error al eliminar usuario:', error));
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ 
          position: 'absolute', top: '50%', left: '50%', 
          transform: 'translate(-50%, -50%)', width: 600, 
          bgcolor: 'background.paper', boxShadow: 24, p: 4,
          borderRadius: 2
      }}>
        <Typography variant="h6" gutterBottom>
          Administración de Usuarios
        </Typography>
        <Button variant="contained" onClick={() => setOpenRegister(true)} sx={{ mb: 2 }}>
          Crear usuario
        </Button>
        {usuarios.length > 0 ? (
          <List>
            {usuarios.map((user) => (
              <ListItem key={user.id} divider>
                <ListItemText 
                  primary={`${user.nombre} (${user.username})`} 
                  secondary={`Rol: ${user.rol}`} 
                />
                {editingUserId === user.id ? (
                  <>
                    <TextField 
                      select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      size="small"
                      variant="outlined"
                    >
                      {ROLES.map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button variant="contained" color="primary" onClick={() => handleSave(user.id)} sx={{ ml: 1 }}>
                      Guardar
                    </Button>
                    <Button variant="outlined" onClick={() => setEditingUserId(null)} sx={{ ml: 1 }}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <IconButton onClick={() => handleEditClick(user)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(user.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </>
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No hay usuarios disponibles.</Typography>
        )}
        <RegisterPopup
          open={openRegister}
          onClose={() => setOpenRegister(false)}
          onRegisterSuccess={fetchUsuarios}
          showRoleSelector
        />
      </Box>
    </Modal>
  );
};

export default AdminUsuariosModal;
