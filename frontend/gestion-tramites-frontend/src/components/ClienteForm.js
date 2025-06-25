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
    fecha_inicio_tramite: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios
      .post(
        'https://sistemagestion-pk62.onrender.com/api/clientes',
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      .then((response) => {
        onClienteAgregado(response.data);
        setFormData({
          nombre: '',
          integrantes: '',
          numeroRecibo: '',
          estadoTramite: 'Recepción de documentos',
          fecha_inicio_tramite: ''
        });
      })
      .catch((error) =>
        console.error('Error al agregar cliente:', error)
      );
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      mb={2}
      sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}
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
        type="number"
        value={formData.integrantes}
        onChange={handleChange}
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
