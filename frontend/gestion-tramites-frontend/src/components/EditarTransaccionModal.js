import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import axios from 'axios';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const EditarTransaccionModal = ({ open, onClose, transaccion, onTransaccionUpdated }) => {
  const [tipo, setTipo] = useState('');
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState('');
  const [monto, setMonto] = useState('');
  const [clientId, setClientId] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo'); // Valor predeterminado
  const [clients, setClients] = useState([]);

  // Cargar clientes al abrir el modal
  useEffect(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/clientes', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(response => setClients(response.data))
      .catch(error => console.error('Error al cargar clientes:', error));
  }, []);

  // Actualizar los datos cuando se abre el modal con una transacción existente
  useEffect(() => {
    if (transaccion) {
      setTipo(transaccion.tipo || '');
      setConcepto(transaccion.concepto || '');
      setFecha(transaccion.fecha ? transaccion.fecha.slice(0, 10) : '');
      setMonto(transaccion.monto || '');
      setClientId(transaccion.client_id || '');
      setFormaPago(transaccion.forma_pago || 'efectivo');
    }
  }, [transaccion]);

  const handleGuardar = async () => {
    try {
      const response = await axios.put(
        `https://sistemagestion-pk62.onrender.com/api/finanzas/${transaccion.id}`,
        {
          tipo,
          concepto,
          fecha,
          monto,
          client_id: clientId || null, // Evita errores con valores vacíos
          forma_pago: formaPago || 'efectivo',
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      onTransaccionUpdated(response.data);
      alert('Transacción actualizada correctamente');
      onClose();
    } catch (error) {
      console.error('Error al actualizar la transacción:', error);
      alert('Error al actualizar la transacción.');
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>
          Editar Transacción
        </Typography>
        <TextField
          select
          label="Tipo"
          fullWidth
          margin="normal"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <MenuItem value="ingreso">Ingreso</MenuItem>
          <MenuItem value="egreso">Egreso</MenuItem>
          <MenuItem value="abono">Abono</MenuItem>
          <MenuItem value="retiro">Retiro</MenuItem>
          <MenuItem value="documento">Documento</MenuItem>
        </TextField>
        <TextField
          label="Concepto"
          fullWidth
          margin="normal"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
        />
        <TextField
          label="Fecha"
          type="date"
          fullWidth
          margin="normal"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Monto"
          fullWidth
          margin="normal"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel id="client-select-label">Cliente (opcional)</InputLabel>
          <Select
            labelId="client-select-label"
            label="Cliente (opcional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <MenuItem value="">
              <em>Ninguno</em>
            </MenuItem>
            {clients.map(client => (
              <MenuItem key={client.id} value={client.id}>
                {client.nombre} - {client.numero_recibo}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* NUEVO: Campo para Forma de Pago */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="forma-pago-label">Forma de Pago</InputLabel>
          <Select
            labelId="forma-pago-label"
            label="Forma de Pago"
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
          >
            <MenuItem value="efectivo">Efectivo</MenuItem>
            <MenuItem value="transferencia">Transferencia</MenuItem>
          </Select>
        </FormControl>
        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
          <Button variant="contained" color="primary" onClick={handleGuardar}>
            Guardar
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Cancelar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default EditarTransaccionModal;
