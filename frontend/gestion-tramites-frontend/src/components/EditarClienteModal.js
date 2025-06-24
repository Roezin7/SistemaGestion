// src/components/EditarClienteModal.js

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField
} from '@mui/material';
import axios from 'axios';

export default function EditarClienteModal({
  open,
  onClose,
  cliente,
  onClienteUpdated
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

  useEffect(() => {
    if (!cliente) return;
    setFormData({
      nombre: cliente.nombre || '',
      integrantes: cliente.integrantes || '',
      numeroRecibo: cliente.numero_recibo || '',
      estadoTramite: cliente.estado_tramite || '',
      fecha_cita_cas: cliente.fecha_cita_cas ? cliente.fecha_cita_cas.slice(0,10) : '',
      fecha_cita_consular: cliente.fecha_cita_consular ? cliente.fecha_cita_consular.slice(0,10) : '',
      fecha_inicio_tramite: cliente.fecha_inicio_tramite ? cliente.fecha_inicio_tramite.slice(0,10) : '',
      costo_total_tramite: cliente.costo_total_tramite || '',
      costo_total_documentos: cliente.costo_total_documentos || ''
    });
  }, [cliente]);

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
        onClienteUpdated(res.data);
        onClose();
      })
      .catch(console.error);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle><strong>Editar Cliente</strong></DialogTitle>
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
          {/* ➕ Nuevo campo para editar fecha de inicio */}
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
              label="Estado de Trámite"
              name="estadoTramite"
              value={formData.estadoTramite}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          {/* ...otros campos existentes (fechas de citas, costos, etc.) */}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>
          <strong>Guardar</strong>
        </Button>
      </DialogActions>
    </Dialog>
  );
}
