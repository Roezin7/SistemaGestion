import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import PriceCheckOutlinedIcon from '@mui/icons-material/PriceCheckOutlined';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../services/api';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';
import MetricCard from './ui/MetricCard';
import PageHeader from './ui/PageHeader';
import SectionCard from './ui/SectionCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        color: '#42515c',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(13, 34, 41, 0.92)',
      padding: 12,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(13, 59, 69, 0.08)' },
      ticks: { color: '#5c6a74' },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#5c6a74', maxRotation: 0 },
    },
  },
};

function Dashboard() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [kpis, setKpis] = useState({
    ingreso_total: 0,
    abonos_totales: 0,
    egreso_total: 0,
    balance_general: 0,
    tramites_mensuales: 0,
    saldo_restante: 0,
    totalEfectivo: 0,
    totalTransferencia: 0,
  });
  const [chartDataIngresos, setChartDataIngresos] = useState({ labels: [], datasets: [] });
  const [chartDataTramites, setChartDataTramites] = useState({ labels: [], datasets: [] });
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [kpisResponse, chartResponse, clientesResponse] = await Promise.all([
        api.get('/api/kpis', { params: dateRange }),
        api.get('/api/kpis/chart', { params: dateRange }),
        api.get('/api/clientes'),
      ]);

      setKpis(kpisResponse.data);
      setClientes(clientesResponse.data);

      setChartDataIngresos({
        labels: chartResponse.data.labels,
        datasets: [
          {
            label: 'Ingresos',
            data: chartResponse.data.ingresos,
            backgroundColor: 'rgba(13, 94, 111, 0.72)',
            borderRadius: 10,
          },
          {
            label: 'Egresos',
            data: chartResponse.data.egresos,
            backgroundColor: 'rgba(197, 140, 69, 0.76)',
            borderRadius: 10,
          },
        ],
      });

      setChartDataTramites({
        labels: chartResponse.data.labels,
        datasets: [
          {
            label: 'Trámites diarios',
            data: chartResponse.data.tramites,
            borderColor: '#0d5e6f',
            backgroundColor: 'rgba(13, 94, 111, 0.14)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      });
    } catch (requestError) {
      setError('No fue posible cargar el resumen operativo.');
      console.error('Error al cargar dashboard:', requestError);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalSaldoRestante = clientes.reduce((sum, cliente) => sum + Number(cliente.restante || 0), 0);

  return (
    <Box>
      <PageHeader
        eyebrow="Vista ejecutiva"
        title="Dashboard"
        subtitle="Consulta el estado general del despacho, la salud financiera del periodo y el avance operativo del equipo."
        actions={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <TextField
              label="Fecha inicial"
              type="date"
              name="fechaInicio"
              value={dateRange.fechaInicio}
              onChange={(event) => setDateRange((current) => ({ ...current, [event.target.name]: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonthRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Fecha final"
              type="date"
              name="fechaFin"
              value={dateRange.fechaFin}
              onChange={(event) => setDateRange((current) => ({ ...current, [event.target.name]: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonthRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" onClick={loadDashboard} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar panel'}
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Ingreso total"
            value={currencyFormatter.format(kpis.ingreso_total || 0)}
            helper="Incluye ingresos, abonos y documentos del periodo."
            icon={<AccountBalanceWalletOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Balance general"
            value={currencyFormatter.format(kpis.balance_general || 0)}
            helper="Resultado neto del periodo consultado."
            icon={<SavingsOutlinedIcon />}
            tone="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Saldo restante"
            value={currencyFormatter.format(totalSaldoRestante)}
            helper="Monto pendiente consolidado de la cartera activa."
            icon={<PriceCheckOutlinedIcon />}
            tone="accent"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Trámites del periodo"
            value={String(kpis.tramites_mensuales || 0)}
            helper="Expedientes creados dentro del rango actual."
            icon={<FolderSharedOutlinedIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            label="Abonos totales"
            value={currencyFormatter.format(kpis.abonos_totales || 0)}
            icon={<PaymentsOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            label="Egresos"
            value={currencyFormatter.format(kpis.egreso_total || 0)}
            icon={<PaymentsOutlinedIcon />}
            tone="accent"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            label="Efectivo recibido"
            value={currencyFormatter.format(kpis.totalEfectivo || 0)}
            icon={<AccountBalanceWalletOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            label="Transferencias"
            value={currencyFormatter.format(kpis.totalTransferencia || 0)}
            icon={<AccountBalanceWalletOutlinedIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 1 }}>
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="Flujo financiero"
            subtitle="Comparativo de ingresos y egresos a lo largo del rango consultado."
          >
            <Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <CircularProgress /> : <Bar data={chartDataIngresos} options={chartOptions} />}
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard
            title="Ritmo operativo"
            subtitle="Volumen diario de trámites iniciados en el sistema."
          >
            <Box sx={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <CircularProgress /> : <Line data={chartDataTramites} options={chartOptions} />}
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      <SectionCard
        title="Lectura rápida del periodo"
        subtitle="Resumen para revisar la operación sin entrar todavía a detalle por módulo."
        sx={{ mt: 2.5 }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Finanzas</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              El sistema reporta un balance de {currencyFormatter.format(kpis.balance_general || 0)} con una cartera
              pendiente acumulada de {currencyFormatter.format(totalSaldoRestante)}.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Cobranza</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Se registraron {currencyFormatter.format(kpis.abonos_totales || 0)} en abonos y {currencyFormatter.format(kpis.totalEfectivo || 0)}
              {' '}en efectivo dentro del periodo consultado.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6">Operación</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Hay {clientes.length} clientes cargados en el sistema y {kpis.tramites_mensuales || 0} trámites nuevos
              dentro del rango actual.
            </Typography>
          </Grid>
        </Grid>
      </SectionCard>
    </Box>
  );
}

export default Dashboard;
