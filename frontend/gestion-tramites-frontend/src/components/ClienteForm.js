// src/components/ClienteForm.js

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Typography
} from '@mui/material';
import axios from 'axios';

export default function ClienteForm({ onClienteAdded }) {
  const [formData, setFormData] = useState({
    nombre: '',
    integrantes: '',
    numeroRecibo: '',
    estadoTramite: '',
    fecha_inicio_tramite: new Date().toISOString().slice(0,10)
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(fd => ({ ...fd, [name]: value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    axios.post('/api/clientes', formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        onClienteAdded(res.data);
        setFormData({
          nombre: '',
          integrantes: '',
          numeroRecibo: '',
          estadoTramite: '',
          fecha_inicio_tramite: new Date().toISOString().slice(0,10)
        });
      })
      .catch(console.error);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom><strong>Agregar Nuevo Cliente</strong></Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Integrantes"
            name="integrantes"
            value={formData.integrantes}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Número de Recibo"
            name="numeroRecibo"
            value={formData.numeroRecibo}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Estado de Trámite"
            name="estadoTramite"
            value={formData.estadoTramite}
            onChange={handleChange}
            fullWidth
          />
        </Grid>
        {/* ➕ Nuevo campo para fecha de inicio de trámite */}
        <Grid item xs={6}>
          <TextField
            label="Fecha Inicio Trámite"
            name="fecha_inicio_tramite"
            type="date"
            value={formData.fecha_inicio_tramite}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained">
            <strong>Guardar Cliente</strong>
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
