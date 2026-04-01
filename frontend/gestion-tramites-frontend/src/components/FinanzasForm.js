import React, { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import api from '../services/api';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import SectionCard from './ui/SectionCard';

function FinanzasForm({ onTransaccionCreated = () => {} }) {
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    concepto: '',
    fecha: '',
    monto: '',
    client_id: '',
    forma_pago: 'efectivo',
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  useEffect(() => {
    api.get('/api/clientes')
      .then((response) => setClients(response.data))
      .catch((error) => console.error('Error al cargar clientes:', error));
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/finanzas', formData);
      setFormData({
        tipo: 'ingreso',
        concepto: '',
        fecha: '',
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
    } catch (error) {
      console.error('Error al guardar transacción:', error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo registrar la transacción.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Registrar movimiento"
        subtitle="Captura ingresos, egresos, abonos, retiros o cargos documentales y asígnalos a un cliente cuando corresponda."
      >
        <Grid container spacing={2} component="form" onSubmit={handleSubmit}>
          <Grid item xs={12} md={2}>
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
          <Grid item xs={12} md={4}>
            <TextField
              label="Concepto"
              name="concepto"
              value={formData.concepto}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
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
          <Grid item xs={12} sm={6} md={2}>
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
          <Grid item xs={12} md={2}>
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
          <Grid item xs={12} md={8}>
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
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<RequestQuoteOutlinedIcon />}
              disabled={loading}
              fullWidth
              sx={{ height: '100%' }}
            >
              {loading ? 'Guardando...' : 'Registrar movimiento'}
            </Button>
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

export default FinanzasForm;
