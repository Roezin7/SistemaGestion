// src/components/UltimasTransacciones.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  TextField,
  Button,
  Grid,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { getDefaultDateRange } from '../utils/dateUtils';  
import { currencyFormatter } from '../utils/formatUtils';  
import EditarTransaccionModal from './EditarTransaccionModal';  

const UltimasTransacciones = () => {
  const defaultRange = getDefaultDateRange();
  const [dateRange, setDateRange] = useState({
    fechaInicio: defaultRange.fechaInicio,
    fechaFin: defaultRange.fechaFin,
  });

  const [transacciones, setTransacciones] = useState([]);
  const [selectedTransaccion, setSelectedTransaccion] = useState(null);
  const [openEditarModal, setOpenEditarModal] = useState(false);

  // Cargar transacciones desde el backend
  const cargarTransacciones = () => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/finanzas/ultimas', { params: dateRange })
      .then(response => setTransacciones(response.data))
      .catch(error => console.error('Error al cargar transacciones:', error));
  };

  useEffect(() => {
    cargarTransacciones();
  }, [dateRange]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  // Eliminar transacción
  const handleDeleteTransaccion = (id) => {
    if (window.confirm('¿Desea eliminar esta transacción?')) {
      axios.delete(`https://sistemagestion-pk62.onrender.com/api/finanzas/${id}`)
        .then(() => {
          cargarTransacciones();
        })
        .catch(error => console.error('Error al eliminar transacción:', error));
    }
  };

  // Abrir el modal de edición para una transacción
  const handleEditTransaccion = (tran) => {
    setSelectedTransaccion(tran);
    setOpenEditarModal(true);
  };

  // Cerrar el modal de edición y refrescar la lista
  const handleCloseEditarModal = () => {
    setOpenEditarModal(false);
    setSelectedTransaccion(null);
    cargarTransacciones();
  };

  // Calcular el balance general
  const totalIngresos = transacciones
    .filter(t => t.tipo === 'ingreso' || t.tipo === 'abono')
    .reduce((sum, t) => sum + parseFloat(t.monto), 0);

  const totalEgresos = transacciones
    .filter(t => t.tipo === 'egreso' || t.tipo === 'retiro')
    .reduce((sum, t) => sum + parseFloat(t.monto), 0);

  const balanceGeneral = totalIngresos - totalEgresos;

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        Últimas Transacciones
      </Typography>

      {/* Filtros de fecha */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Fecha Inicio"
            type="date"
            name="fechaInicio"
            value={dateRange.fechaInicio}
            onChange={handleDateChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Fecha Fin"
            type="date"
            name="fechaFin"
            value={dateRange.fechaFin}
            onChange={handleDateChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={cargarTransacciones}
            fullWidth
            sx={{ height: '56px' }}
          >
            Buscar
          </Button>
        </Grid>
      </Grid>

      {/* Tabla */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#06588a' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Concepto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Monto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Forma de Pago</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transacciones.map((tran) => (
              <TableRow key={tran.id}>
                <TableCell>{tran.id}</TableCell>
                <TableCell><strong>{tran.tipo}</strong></TableCell>
                <TableCell>{tran.concepto}</TableCell>
                <TableCell>{new Date(tran.fecha).toISOString().slice(0, 10)}</TableCell>
                <TableCell>
                  {currencyFormatter.format(parseFloat(tran.monto))}
                </TableCell>
                <TableCell>{tran.forma_pago ? tran.forma_pago : 'No especificado'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEditTransaccion(tran)}>
                    <EditIcon color="primary" />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteTransaccion(tran.id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {transacciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay transacciones en este rango de fechas
                </TableCell>
              </TableRow>
            )}
            {/* Balance General al Final */}
            <TableRow sx={{ backgroundColor: '#f1f1f1', fontWeight: 'bold' }}>
              <TableCell colSpan={4} align="right">Total Ingresos:</TableCell>
              <TableCell>{currencyFormatter.format(totalIngresos)}</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: '#f1f1f1', fontWeight: 'bold' }}>
              <TableCell colSpan={4} align="right">Total Egresos:</TableCell>
              <TableCell>{currencyFormatter.format(totalEgresos)}</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: '#d1e7dd', fontWeight: 'bold' }}>
              <TableCell colSpan={4} align="right">Balance General:</TableCell>
              <TableCell>{currencyFormatter.format(balanceGeneral)}</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UltimasTransacciones;

