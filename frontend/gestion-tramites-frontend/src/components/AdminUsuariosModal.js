// src/components/AdminUsuariosModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText, Button } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';

const AdminUsuariosModal = ({ open, onClose }) => {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    if (open) {
      axios.get(`${API_URL}/api/auth/usuarios`, { 
        headers: { Authorization: localStorage.getItem('token') } 
      })
        .then(response => setUsuarios(response.data))
        .catch(error => console.error('Error al cargar usuarios:', error));
    }
  }, [open]);

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
                {/* Aquí podrías agregar botones para actualizar rol o eliminar usuario */}
                <Button variant="outlined" size="small" sx={{ mr: 1 }}>Editar</Button>
                <Button variant="outlined" color="error" size="small">Eliminar</Button>
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
