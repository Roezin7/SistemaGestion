import React, { useState } from 'react';
import {
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import api from '../services/api';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import SectionCard from './ui/SectionCard';
import { ESTADOS_TRAMITE } from '../utils/statusUtils';

function ClienteForm({
  onClienteAgregado = () => {},
  onSuccess,
  onCancel,
  embedded = false,
}) {
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
      onSuccess?.(response.data);
    } catch (error) {
      console.error('Error al agregar cliente:', error);
      setFeedback({
        open: true,
        severity: 'error',
        message: error.response?.data?.error || 'No se pudo registrar el cliente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
      <Grid item xs={12}>
        <TextField
          label="Nombre completo"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          fullWidth
          autoFocus
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Integrantes"
          name="integrantes"
          type="number"
          value={formData.integrantes}
          onChange={handleChange}
          inputProps={{ min: 1 }}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Número de recibo"
          name="numeroRecibo"
          value={formData.numeroRecibo}
          onChange={handleChange}
          required
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
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
      <Grid item xs={12}>
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
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          La ficha, costos y documentación se completan desde el detalle del cliente.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
          {onCancel ? (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="contained"
            startIcon={<PersonAddAlt1OutlinedIcon />}
            disabled={loading}
            sx={{ minWidth: 200 }}
          >
            {loading ? 'Guardando...' : 'Registrar cliente'}
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );

  return (
    <>
      {embedded ? (
        formContent
      ) : (
        <SectionCard title="Nuevo cliente" subtitle="Alta rápida de expediente.">
          {formContent}
        </SectionCard>
      )}

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
