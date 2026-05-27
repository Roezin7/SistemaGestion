import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import api from '../services/api';

const TIPO_OPTIONS = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'abono', label: 'Abono' },
  { value: 'documento', label: 'Documento' },
];

const FORMA_PAGO_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
];

export default function EditarTransaccionModal({
  open,
  onClose = () => {},
  transaccion,
  onTransaccionUpdated = () => {},
}) {
  const [datos, setDatos] = useState({
    tipo: '',
    concepto: '',
    fecha: '',
    monto: '',
    client_id: '',
    forma_pago: ''
  });
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !transaccion) {
      return;
    }

    setDatos({
      tipo: transaccion.tipo || '',
      concepto: transaccion.concepto || '',
      fecha: transaccion.fecha ? String(transaccion.fecha).slice(0, 10) : '',
      monto: transaccion.monto ? String(transaccion.monto) : '',
      client_id: transaccion.client_id || '',
      forma_pago: transaccion.forma_pago || 'efectivo',
    });
    setError('');
  }, [open, transaccion]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoadingClientes(true);
    api.get('/api/clientes')
      .then((res) => {
        setClientes(res.data);
      })
      .catch((requestError) => {
        console.error('Error al cargar clientes:', requestError);
        setError('No se pudo cargar la lista de clientes.');
      })
      .finally(() => setLoadingClientes(false));
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatos(d => ({ ...d, [name]: value }));
  };

  const handleSave = async () => {
    setError('');

    if (!datos.tipo || !datos.concepto.trim() || !datos.fecha || Number(datos.monto) <= 0) {
      setError('Tipo, concepto, fecha y un monto mayor a cero son obligatorios.');
      return;
    }

    if ((datos.tipo === 'abono' || datos.tipo === 'documento') && !datos.client_id) {
      setError('Selecciona un cliente para abonos o documentos.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put(`/api/finanzas/${transaccion.id}`, {
        ...datos,
        concepto: datos.concepto.trim(),
      });
      onTransaccionUpdated(response.data);
      onClose();
    } catch (requestError) {
      console.error('Error al actualizar la transacción:', requestError);
      setError(requestError.response?.data?.error || 'No se pudo actualizar la transacción.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar transacción</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              name="tipo"
              value={datos.tipo}
              label="Tipo"
              onChange={handleChange}
            >
              {TIPO_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Concepto"
            name="concepto"
            value={datos.concepto}
            onChange={handleChange}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Fecha"
              type="date"
              name="fecha"
              value={datos.fecha}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Monto"
              type="number"
              name="monto"
              value={datos.monto}
              onChange={handleChange}
              inputProps={{ min: 0, step: '0.01' }}
            />
          </Stack>

          <FormControl fullWidth disabled={loadingClientes}>
            <InputLabel>Cliente</InputLabel>
            <Select
              name="client_id"
              value={datos.client_id}
              label="Cliente"
              onChange={handleChange}
            >
              <MenuItem value="">
                <em>Sin cliente</em>
              </MenuItem>
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nombre} ({cliente.numero_recibo || 'sin recibo'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Forma de pago</InputLabel>
            <Select
              name="forma_pago"
              value={datos.forma_pago}
              label="Forma de pago"
              onChange={handleChange}
            >
              {FORMA_PAGO_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
