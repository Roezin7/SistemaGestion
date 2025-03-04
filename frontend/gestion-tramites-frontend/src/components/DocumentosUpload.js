// src/components/DocumentosUpload.js
import React, { useState } from 'react';
import { Box, Button, InputLabel } from '@mui/material';
import axios from 'axios';

const DocumentosUpload = ({ clienteId }) => {
  const [archivos, setArchivos] = useState([]);

  const handleChange = (e) => {
    setArchivos(e.target.files);
  };

  const handleUpload = (e) => {
    e.preventDefault();
    const formData = new FormData();
    for (let i = 0; i < archivos.length; i++) {
      formData.append('documentos', archivos[i]);
    }
    axios.post(`https://sistemagestion-pk62.onrender.com/api/clientes/${clienteId}/documentos`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })
      .then(response => alert('Documentos subidos exitosamente'))
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
