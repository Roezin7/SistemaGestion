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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Divider,
  Box
} from '@mui/material';
import axios from 'axios';

const VerInformacionClienteModal = ({ open, onClose, cliente, onClienteUpdated }) => {
  const [costoTotal, setCostoTotal] = useState('');
  const [abonosData, setAbonosData] = useState({ total_abono: 0, abonos: [] });

  useEffect(() => {
    if (cliente) {
      setCostoTotal(cliente.costo_total_tramite || 0);

      // Cargar historial de abonos
      axios.get(`https://sistemagestion-pk62.onrender.com/api/finanzas/abonos/${cliente.id}`)
        .then(response => setAbonosData(response.data))
        .catch(error => console.error('Error al cargar abonos:', error));
    }
  }, [cliente]);

  // Actualizar el costo total
  const handleGuardarCosto = () => {
    if (!cliente) return;
    axios.put(`https://sistemagestion-pk62.onrender.com/api/clientes/${cliente.id}`, {
      ...cliente,
      costo_total_tramite: costoTotal
    })
      .then(response => {
        if (onClienteUpdated) {
          onClienteUpdated(response.data);
        }
        alert('Costo actualizado');
      })
      .catch(error => console.error('Error al actualizar costo:', error));
  };

  const saldoRestante = parseFloat(costoTotal) - parseFloat(abonosData.total_abono);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        Información Adicional del Cliente
      </DialogTitle>
      <DialogContent>
        {cliente && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Sección de datos generales */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Datos Generales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Fecha de Inicio de Trámite:
                  </Typography>
                  <Typography>
                    {cliente.fecha_creacion
                      ? cliente.fecha_creacion.slice(0, 10)
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Costo Total del Trámite:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={costoTotal}
                      onChange={(e) => setCostoTotal(e.target.value)}
                      sx={{ width: 100 }}
                    />
                    <Button variant="outlined" onClick={handleGuardarCosto}>
                      Guardar
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Fecha Cita CAS:
                  </Typography>
                  <Typography>
                    {cliente.fecha_cita_cas
                      ? cliente.fecha_cita_cas.slice(0, 10)
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Fecha Cita Consular:
                  </Typography>
                  <Typography>
                    {cliente.fecha_cita_consular
                      ? cliente.fecha_cita_consular.slice(0, 10)
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Sección de abonos y saldo */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Abonos y Saldo
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Total Abonos:
                  </Typography>
                  <Typography>
                    ${parseFloat(abonosData.total_abono).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>
                    Saldo Restante:
                  </Typography>
                  <Typography color={saldoRestante < 0 ? 'error' : 'inherit'}>
                    ${saldoRestante.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />

              {/* Tabla de historial de abonos */}
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Historial de Abonos
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#06588a' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      Concepto
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      Fecha
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                      Monto
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.abonos || []).map((abono) => ( 
                    <TableRow key={abono.id}>
                      <TableCell>
                        <strong>{abono.concepto}</strong>
                      </TableCell>
                      <TableCell>
                        {abono.fecha ? abono.fecha.slice(0, 10) : '-'}
                      </TableCell>
                      <TableCell>
                        ${parseFloat(abono.monto).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {abonosData.abonos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No hay abonos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerInformacionClienteModal;
