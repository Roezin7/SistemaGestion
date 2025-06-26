// src/components/VerInformacionClienteModal.js

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, Typography, TextField,
  Box, Paper, List, ListItem, ListItemText, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

export default function VerInformacionClienteModal({
  open,
  onClose = () => {},
  cliente,                       // { id }
  onClienteUpdated = () => {}
}) {
  const [clienteData, setClienteData]       = useState(null);
  const [abonosList, setAbonosList]         = useState([]);
  const [costoTotal, setCostoTotal]         = useState(0);
  const [costoDocumentos, setCostoDocumentos] = useState(0);  // ← nuevo
  const [abonoRecibido, setAbonoRecibido]   = useState(0);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!open || !cliente?.id) return;

    // 1) Traer datos del cliente
    axios.get(`/api/clientes/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const c = res.data;
      setClienteData(c);
      setCostoTotal(c.costo_total_tramite   || 0);
      setCostoDocumentos(c.costo_total_documentos || 0); // usamos campo existente
      setAbonoRecibido(0);  // empezamos manuales en 0
    })
    .catch(console.error);

    // 2) Traer historial de abonos (finanzas)
    axios.get(`/api/finanzas/abonos/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setAbonosList(res.data.abonos))
    .catch(console.error);

  }, [open, cliente]);

  // Guardar Costo Trámite + Costo Documentos + Abono Manual
  const handleGuardar = () => {
    axios.put(
      `/api/clientes/${cliente.id}`,
      {
        ...clienteData,
        costo_total_tramite:   costoTotal,
        costo_total_documentos: costoDocumentos
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(res => {
      onClienteUpdated(res.data);
      alert('Datos guardados');
    })
    .catch(console.error);
  };

  // Eliminar abono financiero
  const handleDeleteAbono = (abonoId) => {
    axios.delete(`/api/finanzas/abonos/${abonoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() =>
      axios.get(`/api/finanzas/abonos/${cliente.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    )
    .then(res => setAbonosList(res.data.abonos))
    .catch(console.error);
  };

  // Suma de abonos extraídos
  const totalAbonosFinanzas = abonosList
    .reduce((sum, a) => sum + parseFloat(a.monto), 0);

  // Cálculo final de saldo
  const saldoTotal = 
    parseFloat(costoTotal || 0)
  + parseFloat(costoDocumentos || 0)
  - parseFloat(abonoRecibido   || 0)
  - totalAbonosFinanzas;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Información del Cliente</DialogTitle>
      <DialogContent>
        {clienteData && (
          <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>

            {/* Datos Generales (sin cambios) */}
            <Paper sx={{ p:2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight:'bold', mb:1 }}>
                Datos Generales
              </Typography>
              <Grid container spacing={2}>
                {/* ... nombre, integrantes, recibo, estado, fechas ... */}
              </Grid>
            </Paper>

            {/* Datos Financieros Manuales */}
            <Paper sx={{ p:2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight:'bold', mb:1 }}>
                Datos Financieros
              </Typography>
              <Grid container spacing={2}>
                {/* Costo Total Trámite */}
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Costo Total Trámite:</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <TextField
                      type="number" size="small"
                      value={costoTotal}
                      onChange={e => setCostoTotal(e.target.value)}
                      sx={{ width:120 }}
                    />
                  </Box>
                </Grid>
                {/* ➕ Nuevo: Costo de Documentos */}
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Costo de Documentos:</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <TextField
                      type="number" size="small"
                      value={costoDocumentos}
                      onChange={e => setCostoDocumentos(e.target.value)}
                      sx={{ width:120 }}
                    />
                  </Box>
                </Grid>
                {/* Abonos Manuales */}
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Abono Manual:</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <TextField
                      type="number" size="small"
                      value={abonoRecibido}
                      onChange={e => setAbonoRecibido(e.target.value)}
                      sx={{ width:120 }}
                    />
                  </Box>
                </Grid>
                {/* Saldo Total */}
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Saldo Total:</Typography>
                  <Typography color={saldoTotal < 0 ? 'error' : 'inherit'}>
                    ${saldoTotal.toLocaleString(undefined,{minimumFractionDigits:2})}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Historial de Abonos Extraídos */}
            <Paper sx={{ p:2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight:'bold', mb:1 }}>
                Historial de Abonos
              </Typography>
              {abonosList.length > 0 ? (
                <List>
                  {abonosList.map(a => (
                    <ListItem
                      key={a.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleDeleteAbono(a.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`$${Number(a.monto).toLocaleString()}`}
                        secondary={a.fecha}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No hay abonos registrados.
                </Typography>
              )}
            </Paper>

          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleGuardar}>Guardar Todo</Button>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
