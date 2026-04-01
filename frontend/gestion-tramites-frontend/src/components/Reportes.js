import React, { useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import api from '../services/api';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';
import MetricCard from './ui/MetricCard';
import PageHeader from './ui/PageHeader';
import SectionCard from './ui/SectionCard';

function Reportes() {
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
  const [error, setError] = useState('');

  const handleBuscar = async () => {
    setError('');
    try {
      const [reportesResponse, kpisResponse] = await Promise.all([
        api.get('/api/finanzas/reportes', { params: { fechaInicio, fechaFin } }),
        api.get('/api/kpis', { params: { fechaInicio, fechaFin } }),
      ]);
      setDatos(reportesResponse.data);
      setKpis(kpisResponse.data);
    } catch (requestError) {
      console.error('Error al cargar reportes:', requestError);
      setError('No fue posible generar el reporte para el periodo seleccionado.');
    }
  };

  const exportarExcel = () => {
    const header = [
      ['Reporte Ejecutivo'],
      [`Rango de fechas: ${fechaInicio} - ${fechaFin}`],
      [],
      ['Ingreso Total', 'Abonos Totales', 'Egreso Total', 'Balance General', 'Trámites del Periodo', 'Saldo Restante'],
      [
        kpis.ingreso_total,
        kpis.abonos_totales,
        kpis.egreso_total,
        kpis.balance_general,
        kpis.tramites_mensuales,
        kpis.saldo_restante,
      ],
      [],
      ['ID', 'Tipo', 'Concepto', 'Fecha', 'Monto'],
    ];

    const rows = datos.map((item) => [item.id, item.tipo, item.concepto, item.fecha, item.monto]);
    const worksheet = XLSX.utils.aoa_to_sheet([...header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(dataBlob, `reporte_${fechaInicio}_${fechaFin}.xlsx`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Análisis y exportación"
        title="Reportes"
        subtitle="Filtra por periodo para obtener el consolidado financiero y operativo, con posibilidad de exportación inmediata a Excel."
        actions={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <TextField
              label="Fecha inicial"
              type="date"
              value={fechaInicio}
              onChange={(event) => setFechaInicio(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Fecha final"
              type="date"
              value={fechaFin}
              onChange={(event) => setFechaFin(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" onClick={handleBuscar} startIcon={<ManageSearchOutlinedIcon />}>
              Generar reporte
            </Button>
            <Button variant="outlined" onClick={exportarExcel} startIcon={<DownloadOutlinedIcon />}>
              Exportar
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard label="Ingreso total" value={currencyFormatter.format(kpis.ingreso_total || 0)} />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard label="Balance general" value={currencyFormatter.format(kpis.balance_general || 0)} tone="success" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard label="Saldo restante" value={currencyFormatter.format(kpis.saldo_restante || 0)} tone="accent" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard label="Abonos totales" value={currencyFormatter.format(kpis.abonos_totales || 0)} />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard label="Egresos" value={currencyFormatter.format(kpis.egreso_total || 0)} tone="accent" />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard label="Trámites del periodo" value={String(kpis.tramites_mensuales || 0)} />
        </Grid>
      </Grid>

      <SectionCard
        title="Detalle de transacciones"
        subtitle="Registro consolidado de movimientos dentro del rango consultado."
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {datos.length > 0 ? (
                datos.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.id}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize', fontWeight: 800 }}>{item.tipo}</TableCell>
                    <TableCell>{item.concepto}</TableCell>
                    <TableCell>{new Date(item.fecha).toISOString().slice(0, 10)}</TableCell>
                    <TableCell align="right">{currencyFormatter.format(parseFloat(item.monto))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1">Aún no hay datos para este periodo.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Genera el reporte con otro rango o registra movimientos en finanzas.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </>
  );
}

export default Reportes;
