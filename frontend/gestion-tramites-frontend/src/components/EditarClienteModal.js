// src/components/EditarClienteModal.js
import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, MenuItem, Grid 
} from '@mui/material';
import axios from 'axios';

const estadosTramite = [
  'Recepción de documentos',
  'En proceso de cita',
  'Cita programada',
  'Aprobada',
  'Rechazada'
];

const EditarClienteModal = ({ open, onClose, cliente, onClienteActualizado }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    integrantes: '',
    numeroRecibo: '',
    estadoTramite: '',
    fecha_cita_cas: '',
    fecha_cita_consular: ''
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || '',
        integrantes: cliente.integrantes || '',
        numeroRecibo: cliente.numero_recibo || '',
        estadoTramite: cliente.estado_tramite || '',
        fecha_cita_cas: cliente.fecha_cita_cas ? cliente.fecha_cita_cas.slice(0,10) : '',
        fecha_cita_consular: cliente.fecha_cita_consular ? cliente.fecha_cita_consular.slice(0,10) : ''
      });
    }
  }, [cliente]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGuardar = () => {
    axios.put(`https://sistemagestion-pk62.onrender.com/api/clientes/${cliente.id}`, formData)
      .then(response => {
        onClienteActualizado(response.data);
        onClose();
      })
      .catch(error => console.error('Error al actualizar cliente:', error));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Editar Cliente</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField label="Nombre" name="nombre" value={formData.nombre} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Integrantes" name="integrantes" type="number" value={formData.integrantes} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Número de Recibo" name="numeroRecibo" value={formData.numeroRecibo} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              label="Estado del Trámite"
              name="estadoTramite"
              value={formData.estadoTramite}
              onChange={handleChange}
              fullWidth
            >
              {estadosTramite.map((estado) => (
                <MenuItem key={estado} value={estado}>
                  {estado}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {formData.estadoTramite === 'Cita programada' && (
            <>
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
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGuardar} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditarClienteModal;
