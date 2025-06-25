// src/components/EditarTransaccionModal.js

import React, { useState, useEffect } from 'react';
import {
  Modal, Box, Typography, TextField,
  Button, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
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

export default function EditarTransaccionModal({
  open,
  onClose,
  transaccion,               // { id, tipo, concepto, fecha, monto, client_id, forma_pago }
  onTransaccionUpdated = () => {}
}) {
  const [datos, setDatos] = useState({
    tipo: '',
    concepto: '',
    fecha: '',
    monto: '',
    client_id: '',
    forma_pago: ''
  });

  useEffect(() => {
    if (!open || !transaccion) return;
    setDatos({
      tipo: transaccion.tipo,
      concepto: transaccion.concepto,
      fecha: transaccion.fecha.slice(0,10),
      monto: transaccion.monto.toString(),
      client_id: transaccion.client_id || '',
      forma_pago: transaccion.forma_pago
    });
  }, [open, transaccion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDatos(d => ({ ...d, [name]: value }));
  };

  const handleSave = () => {
    const token = localStorage.getItem('token');
    axios.put(
      `/api/finanzas/${transaccion.id}`,
      datos,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(res => {
      onTransaccionUpdated(res.data);
      onClose();
    })
    .catch(err => {
      console.error('Error al actualizar la transacción:', err);
      alert('No se pudo actualizar. Revisa la consola para detalle.');
    });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>Editar Transacción</Typography>
        <FormControl fullWidth margin="dense">
          <InputLabel>Tipo</InputLabel>
          <Select
            name="tipo"
            value={datos.tipo}
            label="Tipo"
            onChange={handleChange}
          >
            <MenuItem value="ingreso">Ingreso</MenuItem>
            <MenuItem value="egreso">Egreso</MenuItem>
            <MenuItem value="abono">Abono</MenuItem>
            <MenuItem value="documento">Documento</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth margin="dense" label="Concepto"
          name="concepto" value={datos.concepto}
          onChange={handleChange}
        />
        <TextField
          fullWidth margin="dense" label="Fecha"
          type="date" name="fecha"
          value={datos.fecha} onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth margin="dense" label="Monto"
          type="number" name="monto"
          value={datos.monto} onChange={handleChange}
        />
        <TextField
          fullWidth margin="dense" label="Cliente ID"
          name="client_id" type="number"
          value={datos.client_id} onChange={handleChange}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Forma de Pago</InputLabel>
          <Select
            name="forma_pago"
            value={datos.forma_pago}
            label="Forma de Pago"
            onChange={handleChange}
          >
            <MenuItem value="efectivo">Efectivo</MenuItem>
            <MenuItem value="transferencia">Transferencia</MenuItem>
          </Select>
        </FormControl>
        <Box mt={2} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>
            Guardar
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
