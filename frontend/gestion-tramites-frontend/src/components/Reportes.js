import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  InputAdornment,
  MenuItem,
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
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import api from '../services/api';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import MetricCard from './ui/MetricCard';
import PageHeader from './ui/PageHeader';
import SectionCard from './ui/SectionCard';

const TYPE_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'abono', label: 'Abono' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'documento', label: 'Documento' },
];

function Reportes() {
  const defaultRange = getDefaultDateRange();
  const [fechaInicio, setFechaInicio] = useState(defaultRange.fechaInicio);
  const [fechaFin, setFechaFin] = useState(defaultRange.fechaFin);
  const [datos, setDatos] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [kpis, setKpis] = useState({
    ingreso_total: 0,
    abonos_totales: 0,
    egreso_total: 0,
    balance_general: 0,
    tramites_mensuales: 0,
    saldo_restante: 0,
  });
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  const handleBuscar = useCallback(async () => {
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
  }, [fechaFin, fechaInicio]);

  useEffect(() => {
    handleBuscar();
  }, [handleBuscar]);

  const filteredDatos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return datos.filter((item) => {
      const matchesType = typeFilter === 'todos' || item.tipo === typeFilter;
      const matchesSearch = !normalizedSearch || [
        item.tipo,
        item.concepto,
        item.cliente_nombre,
        item.numero_recibo,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      return matchesType && matchesSearch;
    });
  }, [datos, search, typeFilter]);

  const exportarExcel = async () => {
    if (!filteredDatos.length) {
      return;
    }

    try {
      const [{ saveAs }, XLSX] = await Promise.all([
        import('file-saver'),
        import('xlsx'),
      ]);

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
        ['ID', 'Tipo', 'Concepto', 'Cliente', 'No. Recibo', 'Fecha', 'Forma de pago', 'Monto'],
      ];

      const rows = filteredDatos.map((item) => [
        item.id,
        item.tipo,
        item.concepto,
        item.cliente_nombre || '',
        item.numero_recibo || '',
        item.fecha,
        item.forma_pago || '',
        item.monto,
      ]);
      const worksheet = XLSX.utils.aoa_to_sheet([...header, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(dataBlob, `reporte_${fechaInicio}_${fechaFin}.xlsx`);
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Reporte en Excel exportado correctamente.',
      });
    } catch (excelError) {
      console.error('Error al exportar Excel:', excelError);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo exportar el Excel.',
      });
    }
  };

  const exportarPdf = async () => {
    if (!filteredDatos.length) {
      return;
    }

    try {
      const { exportReportToPdf } = await import('../utils/reportPdf');

      exportReportToPdf({
        fechaInicio,
        fechaFin,
        typeFilter,
        search,
        kpis,
        rows: filteredDatos,
      });
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Reporte en PDF exportado correctamente.',
      });
    } catch (pdfError) {
      console.error('Error al exportar PDF:', pdfError);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo exportar el PDF.',
      });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Reportes"
        title="Reportes"
        subtitle="Consolidado financiero y exportación del periodo."
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
              Actualizar
            </Button>
            <Button
              variant="outlined"
              onClick={exportarExcel}
              startIcon={<DownloadOutlinedIcon />}
              disabled={!filteredDatos.length}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              onClick={exportarPdf}
              startIcon={<PictureAsPdfOutlinedIcon />}
              disabled={!filteredDatos.length}
            >
              PDF
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
        subtitle="Registro consolidado dentro del rango."
        actions={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', lg: 'auto' } }}>
            <TextField
              label="Buscar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 240 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Tipo"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mostrando {filteredDatos.length} de {datos.length} movimientos.
        </Typography>

        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            '& table': {
              minWidth: { xs: 720, md: '100%' },
            },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Forma de pago</TableCell>
                <TableCell align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDatos.length > 0 ? (
                filteredDatos.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{new Date(item.fecha).toISOString().slice(0, 10)}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize', fontWeight: 800 }}>{item.tipo}</TableCell>
                    <TableCell>{item.concepto}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.cliente_nombre || 'General'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.numero_recibo || 'Sin recibo'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {item.forma_pago || 'No especificado'}
                    </TableCell>
                    <TableCell align="right">{currencyFormatter.format(parseFloat(item.monto))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1">No hay datos para este filtro.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Ajusta fechas, tipo o búsqueda.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <FeedbackSnackbar
        open={feedback.open}
        severity={feedback.severity}
        message={feedback.message}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

export default Reportes;
