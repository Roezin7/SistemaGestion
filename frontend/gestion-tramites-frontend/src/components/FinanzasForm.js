import React, { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import api from '../services/api';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import SectionCard from './ui/SectionCard';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function FinanzasForm({
  onTransaccionCreated = () => {},
  onSuccess,
  onCancel,
  embedded = false,
}) {
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    concepto: '',
    fecha: getToday(),
    monto: '',
    client_id: '',
    forma_pago: 'efectivo',
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  useEffect(() => {
    api.get('/api/clientes')
      .then((response) => setClients(
        [...response.data].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }))
      ))
      .catch((error) => console.error('Error al cargar clientes:', error));
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const requiresClient = formData.tipo === 'abono' || formData.tipo === 'documento';
    if (requiresClient && !formData.client_id) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Selecciona un cliente para registrar abonos o cargos documentales.',
      });
      return;
    }

    if (Number(formData.monto) <= 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'El monto debe ser mayor a cero.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/finanzas', formData);
      setFormData({
        tipo: 'ingreso',
        concepto: '',
        fecha: getToday(),
        monto: '',
        client_id: '',
        forma_pago: 'efectivo',
      });
      onTransaccionCreated(response.data);
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Transacción registrada correctamente.',
      });
      onSuccess?.(response.data);
    } catch (error) {
      console.error('Error al guardar transacción:', error);
      setFeedback({
        open: true,
        severity: 'error',
        message: error.response?.data?.error || 'No se pudo registrar la transacción.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
      <Grid item xs={12}>
        <TextField
          select
          label="Tipo"
          name="tipo"
          value={formData.tipo}
          onChange={handleChange}
          fullWidth
        >
          <MenuItem value="ingreso">Ingreso</MenuItem>
          <MenuItem value="egreso">Egreso</MenuItem>
          <MenuItem value="abono">Abono</MenuItem>
          <MenuItem value="retiro">Retiro</MenuItem>
          <MenuItem value="documento">Documento</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Concepto"
          name="concepto"
          value={formData.concepto}
          onChange={handleChange}
          required
          fullWidth
          autoFocus
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Fecha"
          name="fecha"
          type="date"
          value={formData.fecha}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Monto"
          name="monto"
          type="number"
          step="0.01"
          value={formData.monto}
          onChange={handleChange}
          required
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel id="forma-pago-label">Forma de pago</InputLabel>
          <Select
            labelId="forma-pago-label"
            label="Forma de pago"
            name="forma_pago"
            value={formData.forma_pago}
            onChange={handleChange}
          >
            <MenuItem value="efectivo">Efectivo</MenuItem>
            <MenuItem value="transferencia">Transferencia</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel id="client-select-label">Cliente asociado</InputLabel>
          <Select
            labelId="client-select-label"
            label="Cliente asociado"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
          >
            <MenuItem value="">
              <em>Sin cliente</em>
            </MenuItem>
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.nombre} · {client.numero_recibo || 'Sin recibo'}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            Obligatorio para abonos y cargos documentales.
          </FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          Usa este panel para registrar movimientos sin mezclar captura con la vista del histórico.
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
            startIcon={<RequestQuoteOutlinedIcon />}
            disabled={loading}
            sx={{ minWidth: 220 }}
          >
            {loading ? 'Guardando...' : 'Registrar movimiento'}
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
        <SectionCard
          title="Registrar movimiento"
          subtitle="Alta de ingresos, egresos, abonos, retiros y cargos documentales."
        >
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

export default FinanzasForm;
