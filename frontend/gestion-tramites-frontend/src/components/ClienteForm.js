// src/components/ClienteForm.js

import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import axios from 'axios';

const ClienteForm = ({ onClienteAgregado }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    integrantes: '',
    numeroRecibo: '',
    estadoTramite: 'Recepción de documentos',
    fecha_inicio_tramite: new Date().toISOString().slice(0,10)
  });

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    axios.post('/api/clientes', formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      onClienteAgregado(res.data);
      setFormData({
        nombre: '',
        integrantes: '',
        numeroRecibo: '',
        estadoTramite: 'Recepción de documentos',
        fecha_inicio_tramite: new Date().toISOString().slice(0,10)
      });
    })
    .catch(err => console.error(err));
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        label="Nombre"
        name="nombre"
        value={formData.nombre}
        onChange={handleChange}
        required
      />
      <TextField
        label="Integrantes"
        name="integrantes"
        value={formData.integrantes}
        onChange={handleChange}
        required
      />
      <TextField
        label="Número de Recibo"
        name="numeroRecibo"
        value={formData.numeroRecibo}
        onChange={handleChange}
        required
      />
      <TextField
        label="Estado de Trámite"
        name="estadoTramite"
        value={formData.estadoTramite}
        onChange={handleChange}
      />
      <TextField
        label="Fecha Inicio Trámite"
        name="fecha_inicio_tramite"
        type="date"
        value={formData.fecha_inicio_tramite}
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
      />
      <Button type="submit" variant="contained">
        Agregar Cliente
      </Button>
    </Box>
  );
};

export default ClienteForm;
