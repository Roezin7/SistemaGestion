// src/components/DocumentosUpload.js
import React, { useState } from 'react';
import { Box, Button, InputLabel } from '@mui/material';
import api from '../services/api';

const DocumentosUpload = ({ clienteId, onUploadComplete = () => {} }) => {
  const [archivos, setArchivos] = useState([]);

  const handleChange = (e) => {
    setArchivos(e.target.files);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!archivos.length) {
      return;
    }
    const formData = new FormData();
    for (let i = 0; i < archivos.length; i++) {
      formData.append('documentos', archivos[i]);
    }
    api.post(`/api/clientes/${clienteId}/documentos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
      .then(() => {
        alert('Documentos subidos exitosamente');
        setArchivos([]);
        onUploadComplete();
      })
      .catch(error => console.error('Error al subir documentos:', error));
  };

  return (
    <Box component="form" onSubmit={handleUpload} mt={2}>
      <InputLabel>Subir Documentos</InputLabel>
      <input type="file" multiple onChange={handleChange} />
      <Button type="submit" variant="outlined" sx={{ ml: 2 }}>Subir</Button>
    </Box>
  );
};

export default DocumentosUpload;
