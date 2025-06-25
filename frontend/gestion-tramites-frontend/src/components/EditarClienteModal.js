// src/components/EditarClienteModal.js

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField
} from '@mui/material';
import axios from 'axios';

export default function EditarClienteModal({
  open,
  onClose = () => {},            // por si no se pasa
  cliente,                       // { id }
  onClienteUpdated = () => {}    // por si no se pasa
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    integrantes: '',
    numeroRecibo: '',
    estadoTramite: '',
    fecha_cita_cas: '',
    fecha_cita_consular: '',
    fecha_inicio_tramite: '',
    costo_total_tramite: '',
    costo_total_documentos: ''
  });

  // Cuando se abra, cargar datos
  useEffect(() => {
    if (!open || !cliente?.id) return;
    const token = localStorage.getItem('token');
    axios.get(`/api/clientes/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const c = res.data;
      setFormData({
        nombre: c.nombre || '',
        integrantes: c.integrantes || '',
        numeroRecibo: c.numero_recibo || '',
        estadoTramite: c.estado_tramite || '',
        fecha_cita_cas: c.fecha_cita_cas?.slice(0,10) || '',
        fecha_cita_consular: c.fecha_cita_consular?.slice(0,10) || '',
        fecha_inicio_tramite: c.fecha_inicio_tramite?.slice(0,10) || '',
        costo_total_tramite: c.costo_total_tramite || '',
        costo_total_documentos: c.costo_total_documentos || ''
      });
    })
    .catch(console.error);
  }, [open, cliente]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(fd => ({ ...fd, [name]: value }));
  };

  const handleSave = () => {
    const token = localStorage.getItem('token');
    axios.put(`/api/clientes/${cliente.id}`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      // Guardar solo si es función
      if (typeof onClienteUpdated === 'function') {
        onClienteUpdated(res.data);
      }
      onClose();
    })
    .catch(console.error);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar Cliente</DialogTitle>
      <DialogContent>
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
              type="number"
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
          <Grid item xs={6}>
            <TextField
              label="Fecha Cita CAS"
              name="fecha_cita_cas"
              type="date"
              value={formData.fecha_cita_cas}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Fecha Cita Consular"
              name="fecha_cita_consular"
              type="date"
              value={formData.fecha_cita_consular}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
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
          <Grid item xs={6}>
            <TextField
              label="Costo Total Trámite"
              name="costo_total_tramite"
              type="number"
              value={formData.costo_total_tramite}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Costo Total Documentos"
              name="costo_total_documentos"
              type="number"
              value={formData.costo_total_documentos}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
