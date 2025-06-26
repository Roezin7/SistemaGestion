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
  cliente,                       
  onClienteUpdated = () => {}
}) {
  const [clienteData, setClienteData]       = useState(null);
  const [autoAbonos, setAutoAbonos]         = useState([]);
  const [totalAutoAbono, setTotalAutoAbono] = useState(0);
  const [costoTramite, setCostoTramite]     = useState(0);
  const [costoDocs, setCostoDocs]           = useState(0);
  const [abonoManual, setAbonoManual]       = useState(0);

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
      setCostoTramite(c.costo_total_tramite  || 0);
      setCostoDocs   (c.costo_total_documentos || 0);
      setAbonoManual (c.abono_inicial          || 0);
    })
    .catch(console.error);

    // 2) Traer abonos automáticos
    axios.get(`/api/finanzas/abonos/${cliente.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      setAutoAbonos(res.data.abonos);
      setTotalAutoAbono(parseFloat(res.data.total_abono) || 0);
    })
    .catch(console.error);

  }, [open, cliente, token]);

  const handleGuardar = () => {
    axios.put(
      `/api/clientes/${cliente.id}`,
      {
        costo_total_tramite:    costoTramite,
        costo_total_documentos: costoDocs,
        abono_inicial:          abonoManual
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(res => {
      onClienteUpdated(res.data);
      alert('Datos guardados');
    })
    .catch(console.error);
  };

  const handleDeleteAbono = (idAbono) => {
    axios.delete(`/api/finanzas/abonos/${idAbono}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() =>
      axios.get(`/api/finanzas/abonos/${cliente.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    )
    .then(res => {
      setAutoAbonos(res.data.abonos);
      setTotalAutoAbono(parseFloat(res.data.total_abono) || 0);
    })
    .catch(console.error);
  };

  // Cálculo de Saldo Restante
  const restanteCalculado =
    Number(costoTramite || 0) +
    Number(costoDocs   || 0) -
    Number(abonoManual || 0) -
    Number(totalAutoAbono || 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Información del Cliente</DialogTitle>
      <DialogContent>
        {clienteData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Información General */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Información General
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Nombre:</strong> {clienteData.nombre}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Número de Recibo:</strong> {clienteData.numero_recibo || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Integrantes:</strong> {clienteData.integrantes ?? '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Estado de Trámite:</strong> {clienteData.estado_tramite || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Fecha Inicio Trámite:</strong>{' '}
                    {clienteData.fecha_inicio_tramite?.slice(0,10) || '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Costos y Abono Manual */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Costos y Abono Manual
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography><strong>Costo Total Trámite:</strong></Typography>
                  <TextField
                    type="number" size="small"
                    value={costoTramite}
                    onChange={e => setCostoTramite(e.target.value)}
                    sx={{ width: 120 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Costo de Documentos:</strong></Typography>
                  <TextField
                    type="number" size="small"
                    value={costoDocs}
                    onChange={e => setCostoDocs(e.target.value)}
                    sx={{ width: 120 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Abono Manual:</strong></Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      type="number" size="small"
                      value={abonoManual}
                      onChange={e => setAbonoManual(e.target.value)}
                      sx={{ width: 120 }}
                    />
                    <Button variant="outlined" onClick={handleGuardar}>
                      Guardar
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Historial de Abonos Automáticos */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Historial de Abonos (Finanzas)
              </Typography>
              {autoAbonos.length ? (
                <List>
                  {autoAbonos.map(a => (
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

            {/* Saldo Restante Calculado */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">
                <strong>Saldo Restante:</strong> ${restanteCalculado.toLocaleString()}
              </Typography>
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
