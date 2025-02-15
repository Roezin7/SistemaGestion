// src/components/EditarTransaccionModal.js
import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button
} from '@mui/material';
import axios from 'axios';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  p: 4,
};

const EditarTransaccionModal = ({ open, transaccion, onClose }) => {
  const [tipo, setTipo] = useState(transaccion.tipo);
  const [concepto, setConcepto] = useState(transaccion.concepto);
  const [fecha, setFecha] = useState(transaccion.fecha);
  const [monto, setMonto] = useState(transaccion.monto);
  const [clientId, setClientId] = useState(transaccion.client_id);

  const handleSubmit = async () => {
    try {
      await axios.put(`/api/finanzas/${transaccion.id}`, {
        tipo,
        concepto,
        fecha,
        monto,
        client_id: clientId,
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" gutterBottom>
          Editar Transacción
        </Typography>
        <TextField
          fullWidth
          label="Tipo"
          margin="normal"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        />
        <TextField
          fullWidth
          label="Concepto"
          margin="normal"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
        />
        <TextField
          fullWidth
          label="Fecha"
          margin="normal"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <TextField
          fullWidth
          label="Monto"
          margin="normal"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <TextField
          fullWidth
          label="Cliente ID"
          margin="normal"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
        <Box mt={2} display="flex" justifyContent="space-between">
          <Button variant="contained" color="primary" onClick={handleSubmit}>
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
