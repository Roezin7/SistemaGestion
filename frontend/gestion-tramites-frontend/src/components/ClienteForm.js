import React, { useState } from 'react';
import {
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import api from '../services/api';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import SectionCard from './ui/SectionCard';

const ESTADOS_TRAMITE = [
  'Recepción de documentos',
  'Revisión inicial',
  'Programación de cita',
  'Proceso consular',
  'Seguimiento',
  'Concluido',
];

function ClienteForm({ onClienteAgregado }) {
  const [formData, setFormData] = useState({
    nombre: '',
    integrantes: '',
    numeroRecibo: '',
    estadoTramite: 'Recepción de documentos',
    fecha_inicio_tramite: '',
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/clientes', formData);
      onClienteAgregado(response.data);
      setFormData({
        nombre: '',
        integrantes: '',
        numeroRecibo: '',
        estadoTramite: 'Recepción de documentos',
        fecha_inicio_tramite: '',
      });
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Cliente registrado correctamente.',
      });
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo registrar el cliente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Alta de cliente"
        subtitle="Registra nuevos expedientes con la información mínima operativa para iniciar su seguimiento."
      >
        <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Nombre completo"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Integrantes"
              name="integrantes"
              type="number"
              value={formData.integrantes}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Número de recibo"
              name="numeroRecibo"
              value={formData.numeroRecibo}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              select
              label="Estado de trámite"
              name="estadoTramite"
              value={formData.estadoTramite}
              onChange={handleChange}
              fullWidth
            >
              {ESTADOS_TRAMITE.map((estado) => (
                <MenuItem key={estado} value={estado}>
                  {estado}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Fecha de inicio"
              name="fecha_inicio_tramite"
              type="date"
              value={formData.fecha_inicio_tramite}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={9}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              sx={{ height: '100%' }}
            >
              <TextField
                label="Notas de operación"
                value="El expediente se registra en la etapa inicial. La información complementaria se completa desde la ficha del cliente."
                fullWidth
                disabled
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<PersonAddAlt1OutlinedIcon />}
                disabled={loading}
                sx={{ minWidth: 210 }}
              >
                {loading ? 'Guardando...' : 'Registrar cliente'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </SectionCard>

      <FeedbackSnackbar
        open={feedback.open}
        severity={feedback.severity}
        message={feedback.message}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

export default ClienteForm;
