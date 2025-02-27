// src/components/AdminUsuariosModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Button, TextField, IconButton } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const AdminUsuariosModal = ({ open, onClose }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newRole, setNewRole] = useState('');

  const fetchUsuarios = () => {
    axios.get(`${API_URL}/api/auth/usuarios`, { 
      headers: { Authorization: localStorage.getItem('token') }
    })
      .then(response => setUsuarios(response.data))
      .catch(error => console.error('Error al cargar usuarios:', error));
  };

  useEffect(() => {
    if (open) {
      fetchUsuarios();
    }
  }, [open]);

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setNewRole(user.rol);
  };

  const handleSave = (userId) => {
    axios.put(`${API_URL}/api/auth/usuarios/${userId}`, { rol: newRole }, { 
      headers: { Authorization: localStorage.getItem('token') }
    })
      .then(response => {
        fetchUsuarios();
        setEditingUserId(null);
        setNewRole('');
      })
      .catch(error => console.error('Error al actualizar rol:', error));
  };

  const handleDelete = (userId) => {
    axios.delete(`${API_URL}/api/auth/usuarios/${userId}`, {
      headers: { Authorization: localStorage.getItem('token') }
    })
      .then(response => fetchUsuarios())
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
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      size="small"
                      variant="outlined"
                    />
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
      </Box>
    </Modal>
  );
};

export default AdminUsuariosModal;
