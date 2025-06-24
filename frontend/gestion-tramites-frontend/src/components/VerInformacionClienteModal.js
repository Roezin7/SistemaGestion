// src/components/VerInformacionClienteModal.js

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  TextField,
  Box,
  Paper
} from '@mui/material';
import axios from 'axios';

export default function VerInformacionClienteModal({
  open,
  onClose,
  cliente,
  onClienteUpdated
}) {
  const [costoTotal, setCostoTotal] = useState(0);
  const [abonoRecibido, setAbonoRecibido] = useState(0);

  useEffect(() => {
    if (!cliente) return;
    setCostoTotal(cliente.costo_total_tramite || 0);
    setAbonoRecibido(cliente.costo_total_documentos || 0);
  }, [cliente]);

  const handleGuardar = () => {
    const token = localStorage.getItem('token');
    axios.put(`/api/clientes/${cliente.id}`, {
      ...cliente,
      costo_total_tramite: costoTotal,
      costo_total_documentos: abonoRecibido
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      onClienteUpdated(res.data);
      alert('Datos guardados');
    })
    .catch(console.error);
  };

  const saldoRestante = parseFloat(costoTotal || 0) - parseFloat(abonoRecibido || 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle><strong>Información Financiera Manual</strong></DialogTitle>
      <DialogContent>
        {cliente && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Detalles del Trámite
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Costo Total de Trámite:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={costoTotal}
                      onChange={e => setCostoTotal(e.target.value)}
                      sx={{ width: 120 }}
                    />
                    <Button variant="outlined" onClick={handleGuardar}>
                      Guardar
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Abono Recibido:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={abonoRecibido}
                      onChange={e => setAbonoRecibido(e.target.value)}
                      sx={{ width: 120 }}
                    />
                    <Button variant="outlined" onClick={handleGuardar}>
                      Guardar
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Saldo Restante:</Typography>
                  <Typography color={saldoRestante < 0 ? 'error' : 'inherit'}>
                    ${saldoRestante.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
