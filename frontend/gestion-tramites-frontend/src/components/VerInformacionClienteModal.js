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
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

export default function VerInformacionClienteModal({
  open,
  onClose,
  cliente,
  onClienteUpdated
}) {
  const [clienteData, setClienteData]     = useState(null);
  const [abonosList, setAbonosList]       = useState([]);
  const [costoTotal, setCostoTotal]       = useState(0);
  const [abonoRecibido, setAbonoRecibido] = useState(0);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!open || !cliente?.id) return;

    // 1) Traer datos del cliente
    axios.get(`/api/clientes/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setClienteData(res.data);
      setCostoTotal(res.data.costo_total_tramite || 0);
      setAbonoRecibido(res.data.costo_total_documentos || 0);
    })
    .catch(console.error);

    // 2) Traer historial de abonos
    axios.get(`/api/finanzas/abonos/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setAbonosList(res.data.abonos))
    .catch(console.error);

  }, [open, cliente]);

  const handleGuardar = () => {
    axios.put(`/api/clientes/${cliente.id}`, {
      ...clienteData,
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

  const handleDeleteAbono = (abonoId) => {
    axios.delete(`/api/finanzas/abonos/${abonoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => axios.get(`/api/finanzas/abonos/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }))
    .then(res => setAbonosList(res.data.abonos))
    .catch(console.error);
  };

  const saldoRestante = parseFloat(costoTotal) - parseFloat(abonoRecibido);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Información del Cliente</DialogTitle>
      <DialogContent>
        {clienteData && (
          <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>

            {/* Datos Generales */}
            <Paper sx={{ p:2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight:'bold', mb:1 }}>
                Datos Generales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography><strong>Nombre:</strong> {clienteData.nombre}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Integrantes:</strong> {clienteData.integrantes}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Estado de Trámite:</strong> {clienteData.estado_tramite}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Fecha Inicio Trámite:</strong>{' '}
                    {clienteData.fecha_inicio_tramite?.slice(0,10)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Datos Financieros */}
            <Paper sx={{ p:2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight:'bold', mb:1 }}>
                Datos Financieros
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Costo Total de Trámite:</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={costoTotal}
                      onChange={e => setCostoTotal(e.target.value)}
                      sx={{ width:120 }}
                    />
                    <Button variant="outlined" onClick={handleGuardar}>
                      Guardar
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Abono Recibido:</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={abonoRecibido}
                      onChange={e => setAbonoRecibido(e.target.value)}
                      sx={{ width:120 }}
                    />
                    <Button variant="outlined" onClick={handleGuardar}>
                      Guardar
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight:'bold' }}>Saldo Restante:</Typography>
                  <Typography color={saldoRestante < 0 ? 'error' : 'inherit'}>
                    ${saldoRestante.toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Historial de Abonos */}
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
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
