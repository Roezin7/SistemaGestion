// src/components/Reportes.js
import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';

const Reportes = () => {
  const defaultRange = getDefaultDateRange();
  const [fechaInicio, setFechaInicio] = useState(defaultRange.fechaInicio);
  const [fechaFin, setFechaFin] = useState(defaultRange.fechaFin);

  const [datos, setDatos] = useState([]);
  const [kpis, setKpis] = useState({
    ingreso_total: 0,
    abonos_totales: 0,
    egreso_total: 0,
    balance_general: 0,
    tramites_mensuales: 0,
    saldo_restante: 0,
  });

  const handleBuscar = () => {
    // 1. Cargar transacciones
    axios.get('https://sistemagestion-pk62.onrender.com/api/finanzas/reportes', {
      params: { fechaInicio, fechaFin }
    })
      .then(response => setDatos(response.data))
      .catch(error => console.error('Error al cargar reportes:', error));

    // 2. Cargar KPI
    axios.get('https://sistemagestion-pk62.onrender.com/api/kpis', {
      params: { fechaInicio, fechaFin }
    })
      .then(response => setKpis(response.data))
      .catch(error => console.error('Error al cargar KPI:', error));
  };

  const exportarExcel = () => {
    // Encabezado + KPI
    const header = [
      ['Reporte Profesional'],
      [`Rango de Fechas: ${fechaInicio} - ${fechaFin}`, ''],
      [],
      [
        'Ingreso Total',
        'Abonos Totales',
        'Egreso Total',
        'Balance General',
        'Trámites Mensuales',
        'Saldo Restante'
      ],
      [
        kpis.ingreso_total,
        kpis.abonos_totales,
        kpis.egreso_total,
        kpis.balance_general,
        kpis.tramites_mensuales,
        kpis.saldo_restante
      ],
      [],
      ['ID', 'Tipo', 'Concepto', 'Fecha', 'Monto']
    ];

    // Convertir datos en un arreglo de arreglos
    const rows = datos.map(item => ([
      item.id,
      item.tipo,
      item.concepto,
      item.fecha,
      item.monto
    ]));

    const hoja = [...header, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(hoja);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(dataBlob, `reporte_${fechaInicio}_${fechaFin}.xlsx`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Reportes
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Fecha Inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Fecha Fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={4} sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={handleBuscar} fullWidth sx={{ height: '56px' }}>
            Buscar
          </Button>
          <Button variant="outlined" onClick={exportarExcel} fullWidth sx={{ height: '56px' }}>
            Exportar Excel
          </Button>
        </Grid>
      </Grid>

      {/* KPI */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Resumen de KPI ({fechaInicio} - {fechaFin})
        </Typography>
        <Grid container spacing={2} sx={{ fontSize: '16px' }}>
          <Grid item xs={12} sm={4}>
            <strong>Ingreso Total:</strong>{' '}
            {currencyFormatter.format(kpis.ingreso_total)}
          </Grid>
          <Grid item xs={12} sm={4}>
            <strong>Abonos Totales:</strong>{' '}
            {currencyFormatter.format(kpis.abonos_totales)}
          </Grid>
          <Grid item xs={12} sm={4}>
            <strong>Egreso Total:</strong>{' '}
            {currencyFormatter.format(kpis.egreso_total)}
          </Grid>
          <Grid item xs={12} sm={4}>
            <strong>Balance General:</strong>{' '}
            {currencyFormatter.format(kpis.balance_general)}
          </Grid>
          <Grid item xs={12} sm={4}>
            <strong>Trámites Mensuales:</strong>{' '}
            {kpis.tramites_mensuales}
          </Grid>
          <Grid item xs={12} sm={4}>
            <strong>Saldo Restante:</strong>{' '}
            {currencyFormatter.format(kpis.saldo_restante)}
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de transacciones */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#06588a' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Concepto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {datos.map(item => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell><strong>{item.tipo}</strong></TableCell>
                <TableCell>{item.concepto}</TableCell>
                <TableCell>{item.fecha}</TableCell>
                <TableCell>
                  {currencyFormatter.format(parseFloat(item.monto))}
                </TableCell>
              </TableRow>
            ))}
            {datos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay datos en este rango de fechas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Reportes;
