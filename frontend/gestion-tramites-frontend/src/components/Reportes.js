import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent } from '@mui/material';
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
    axios.get('https://sistemagestion-pk62.onrender.com/api/finanzas/reportes', { params: { fechaInicio, fechaFin } })
      .then(response => setDatos(response.data))
      .catch(error => console.error('Error al cargar reportes:', error));

    axios.get('https://sistemagestion-pk62.onrender.com/api/kpis', { params: { fechaInicio, fechaFin } })
      .then(response => setKpis(response.data))
      .catch(error => console.error('Error al cargar KPI:', error));
  };

  const exportarExcel = () => {
    const header = [
      ['Reporte Profesional'],
      [`Rango de Fechas: ${fechaInicio} - ${fechaFin}`],
      [],
      ['Ingreso Total', 'Abonos Totales', 'Egreso Total', 'Balance General', 'Trámites Mensuales', 'Saldo Restante'],
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

    const rows = datos.map(item => ([item.id, item.tipo, item.concepto, item.fecha, item.monto]));

    const hoja = [...header, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(hoja);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(dataBlob, `reporte_${fechaInicio}_${fechaFin}.xlsx`);
  };

  return (
    <Box p={2}>
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

      {/* Sección de KPI mejorada */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Ingreso Total', value: kpis.ingreso_total },
          { label: 'Abonos Totales', value: kpis.abonos_totales },
          { label: 'Egreso Total', value: kpis.egreso_total },
          { label: 'Balance General', value: kpis.balance_general },
          { label: 'Trámites Mensuales', value: kpis.tramites_mensuales },
          { label: 'Saldo Restante', value: kpis.saldo_restante }
        ].map((kpi, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Card sx={{ backgroundColor: '#F5F5F5', p: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                  {kpi.label}
                </Typography>
                <Typography variant="h5" sx={{ textAlign: 'center', color: '#555555' }}>
                  {currencyFormatter.format(kpi.value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla de transacciones con balance general al final */}
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
                <TableCell>{new Date(item.fecha).toISOString().slice(0, 10)}</TableCell>
                <TableCell>{currencyFormatter.format(parseFloat(item.monto))}</TableCell>
              </TableRow>
            ))}
            {datos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay datos en este rango de fechas
                </TableCell>
              </TableRow>
            )}
            {/* Fila de balance general */}
            <TableRow sx={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <TableCell colSpan={4} align="right">
                <strong>Balance General:</strong>
              </TableCell>
              <TableCell>
                <strong>{currencyFormatter.format(kpis.balance_general)}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Reportes;
