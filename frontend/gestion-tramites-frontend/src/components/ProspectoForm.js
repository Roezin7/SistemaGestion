import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import api from '../services/api';
import {
  PROSPECT_PRIORITY_OPTIONS,
  PROSPECT_SOURCE_OPTIONS,
  PROSPECT_STATUS_OPTIONS,
} from '../utils/prospectUtils';

const EMPTY_FORM = {
  nombre: '',
  telefono: '',
  email: '',
  interes: '',
  origen: '',
  estado: 'nuevo',
  prioridad: 'media',
  fecha_ultimo_contacto: '',
  fecha_proximo_seguimiento: '',
  notas: '',
};

function normalizeProspectForForm(prospecto) {
  if (!prospecto) {
    return EMPTY_FORM;
  }

  return {
    nombre: prospecto.nombre || '',
    telefono: prospecto.telefono || '',
    email: prospecto.email || '',
    interes: prospecto.interes || '',
    origen: prospecto.origen || '',
    estado: prospecto.estado || 'nuevo',
    prioridad: prospecto.prioridad || 'media',
    fecha_ultimo_contacto: prospecto.fecha_ultimo_contacto ? String(prospecto.fecha_ultimo_contacto).slice(0, 10) : '',
    fecha_proximo_seguimiento: prospecto.fecha_proximo_seguimiento ? String(prospecto.fecha_proximo_seguimiento).slice(0, 10) : '',
    notas: prospecto.notas || '',
  };
}

function ProspectoForm({
  prospecto,
  onSaved = () => {},
  onCancel,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(prospecto?.id);

  useEffect(() => {
    setFormData(normalizeProspectForForm(prospecto));
    setError('');
  }, [prospecto]);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.nombre.trim() || !formData.telefono.trim()) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
      };
      const response = isEditing
        ? await api.put(`/api/prospectos/${prospecto.id}`, payload)
        : await api.post('/api/prospectos', payload);

      if (!isEditing) {
        setFormData(EMPTY_FORM);
      }
      onSaved(response.data);
    } catch (requestError) {
      console.error('Error al guardar prospecto:', requestError);
      setError(requestError.response?.data?.error || 'No se pudo guardar el prospecto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
      {error ? (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      ) : null}

      <Grid item xs={12}>
        <TextField
          label="Nombre del prospecto"
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
          label="Teléfono"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          required
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Correo"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Interés"
          name="interes"
          value={formData.interes}
          onChange={handleChange}
          placeholder="Ej. Visa, residencia, renovación"
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          label="Origen"
          name="origen"
          value={formData.origen}
          onChange={handleChange}
          fullWidth
        >
          <MenuItem value="">Sin origen</MenuItem>
          {PROSPECT_SOURCE_OPTIONS.map((origen) => (
            <MenuItem key={origen} value={origen}>{origen}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          label="Estado"
          name="estado"
          value={formData.estado}
          onChange={handleChange}
          fullWidth
        >
          {PROSPECT_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          label="Prioridad"
          name="prioridad"
          value={formData.prioridad}
          onChange={handleChange}
          fullWidth
        >
          {PROSPECT_PRIORITY_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Último contacto"
          name="fecha_ultimo_contacto"
          type="date"
          value={formData.fecha_ultimo_contacto}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Próximo seguimiento"
          name="fecha_proximo_seguimiento"
          type="date"
          value={formData.fecha_proximo_seguimiento}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Notas"
          name="notas"
          value={formData.notas}
          onChange={handleChange}
          multiline
          minRows={4}
          fullWidth
        />
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
            startIcon={<PersonSearchOutlinedIcon />}
            disabled={loading}
            sx={{ minWidth: 190 }}
          >
            {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Agregar prospecto'}
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}

export default ProspectoForm;
