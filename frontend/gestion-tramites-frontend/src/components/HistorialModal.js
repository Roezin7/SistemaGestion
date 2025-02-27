// src/components/HistorialModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';
import { API_URL } from '../config';

const HistorialModal = ({ open, onClose }) => {
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    if (open) {
      axios.get(`${API_URL}/api/auth/historial`, { 
        headers: { Authorization: localStorage.getItem('token') } 
      })
        .then(response => setHistorial(response.data))
        .catch(error => console.error('Error al cargar historial:', error));
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
          Historial de Cambios del Sistema
        </Typography>
        {historial.length > 0 ? (
          <List>
            {historial.map((item) => (
              <ListItem key={item.id}>
                <ListItemText 
                  primary={item.descripcion} 
                  secondary={`${item.username} - ${new Date(item.fecha).toLocaleString()}`} 
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No hay historial disponible.</Typography>
        )}
      </Box>
    </Modal>
  );
};

export default HistorialModal;
