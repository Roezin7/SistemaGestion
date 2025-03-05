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

      const token = localStorage.getItem('token'); // Obtiene el token

      axios.get(`https://sistemagestion-pk62.onrender.com/api/finanzas/abonos/${cliente.id}`, {
        headers: { Authorization: `Bearer ${token}` } // Enviar token en la cabecera
      })
      .then(response => setAbonosData(response.data))
      .catch(error => console.error('Error al cargar abonos:', error));
    }
  }, [cliente]);

  const handleGuardarCosto = () => {
    if (!cliente) return;

    const token = localStorage.getItem('token'); // Obtiene el token

    axios.put(`https://sistemagestion-pk62.onrender.com/api/clientes/${cliente.id}`, 
      { ...cliente, costo_total_tramite: costoTotal },
      { headers: { Authorization: `Bearer ${token}` } } // Enviar token en la cabecera
    )
    .then(response => {
      if (onClienteUpdated) {
        onClienteUpdated(response.data);
      }
      alert('Costo actualizado');
    })
    .catch(error => console.error('Error al actualizar costo:', error));
  };

  const saldoRestante = parseFloat(costoTotal) - parseFloat(abonosData.total_abono || 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        Información Adicional del Cliente
      </DialogTitle>
      <DialogContent>
        {cliente && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Datos Generales
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Fecha de Inicio de Trámite:</Typography>
                  <Typography>{cliente.fecha_creacion ? cliente.fecha_creacion.slice(0, 10) : '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Costo Total del Trámite:</Typography>
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
              </Grid>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Abonos e Ingresos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Total Abonos:</Typography>
                  <Typography>
                    ${parseFloat(abonosData.total_abono || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Saldo Restante:</Typography>
                  <Typography color={saldoRestante < 0 ? 'error' : 'inherit'}>
                    ${saldoRestante.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Historial de Ingresos y Abonos
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#06588a' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Concepto</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Monto</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Forma de Pago</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(abonosData.abonos) && abonosData.abonos.length > 0 ? (
                    abonosData.abonos.map((abono) => (
                      <TableRow key={abono.id}>
                        <TableCell>{abono.tipo === 'ingreso' ? 'Ingreso' : 'Abono'}</TableCell>
                        <TableCell>{new Date(abono.fecha).toISOString().slice(0, 10)}</TableCell>
                        <TableCell>${parseFloat(abono.monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {abono.forma_pago ? (
                            <span>{abono.forma_pago.charAt(0).toUpperCase() + abono.forma_pago.slice(1)}</span>
                          ) : (
                            <span style={{ color: 'gray' }}>No especificado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No hay registros de ingresos o abonos
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
