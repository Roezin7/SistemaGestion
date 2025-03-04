// src/components/EditarTransaccionModal.js
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
  const [tipo, setTipo] = useState(transaccion.tipo);
  const [concepto, setConcepto] = useState(transaccion.concepto);
  const [fecha, setFecha] = useState(transaccion.fecha);
  const [monto, setMonto] = useState(transaccion.monto);
  const [clientId, setClientId] = useState(transaccion.client_id);
  const [formaPago, setFormaPago] = useState(transaccion.forma_pago || 'efectivo'); // NUEVO campo
  const [clients, setClients] = useState([]);

  useEffect(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/clientes')
      .then(response => setClients(response.data))
      .catch(error => console.error('Error al cargar clientes:', error));
  }, []);

  const handleGuardar = async () => {
    try {
      const response = await axios.put(`https://sistemagestion-pk62.onrender.com/api/finanzas/${transaccion.id}`, {
        tipo,
        concepto,
        fecha,
        monto,
        client_id: clientId,
        forma_pago: formaPago  // Se envía la forma de pago
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      onTransaccionUpdated(response.data);
      onClose();
    } catch (error) {
      console.error('Error al actualizar la transacción:', error);
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
