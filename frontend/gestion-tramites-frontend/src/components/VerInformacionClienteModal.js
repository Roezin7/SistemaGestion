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
  const [costoDocumentos, setCostoDocumentos] = useState('');
  const [abonosData, setAbonosData] = useState({ total_abono: 0, abonos: [] });
  const [documentosData, setDocumentosData] = useState({ total_documento: 0, documentos: [] });

  useEffect(() => {
    if (cliente) {
      setCostoTotal(cliente.costo_total_tramite || 0);
      setCostoDocumentos(cliente.costo_total_documentos || 0);

      const token = localStorage.getItem('token'); // Obtener el token almacenado

      // Cargar historial de abonos
      axios.get(`https://sistemagestion-pk62.onrender.com/api/finanzas/abonos/${cliente.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => setAbonosData(response.data))
      .catch(error => console.error('Error al cargar abonos:', error));

      // Cargar historial de documentos
      axios.get(`https://sistemagestion-pk62.onrender.com/api/finanzas/documentos/${cliente.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => setDocumentosData(response.data))
      .catch(error => console.error('Error al cargar documentos:', error));
    }
  }, [cliente]);

  // Actualizar el costo total y el costo de documentos
  const handleGuardarCosto = () => {
    if (!cliente) return;

    const token = localStorage.getItem('token'); // Obtener el token

    axios.put(`https://sistemagestion-pk62.onrender.com/api/clientes/${cliente.id}`, 
      { 
        ...cliente,
        costo_total_tramite: costoTotal,
        costo_total_documentos: costoDocumentos 
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then(response => {
      if (onClienteUpdated) {
        onClienteUpdated(response.data);
      }
      alert('Costo actualizado');
    })
    .catch(error => console.error('Error al actualizar costo:', error));
  };

  const saldoRestante = parseFloat(costoTotal) + parseFloat(costoDocumentos) - parseFloat(abonosData.total_abono || 0) - parseFloat(documentosData.total_documento || 0);

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
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Costo Total de Documentos:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={costoDocumentos}
                      onChange={(e) => setCostoDocumentos(e.target.value)}
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
                Abonos, Documentos y Saldo
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Total Abonos:</Typography>
                  <Typography>${parseFloat(abonosData.total_abono || 0).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Total Documentos:</Typography>
                  <Typography>${parseFloat(documentosData.total_documento || 0).toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontWeight: 'bold' }}>Saldo Restante:</Typography>
                  <Typography color={saldoRestante < 0 ? 'error' : 'inherit'}>
                    ${saldoRestante.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
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
