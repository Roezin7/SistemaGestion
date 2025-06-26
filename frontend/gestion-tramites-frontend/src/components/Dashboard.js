// src/components/Dashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, Paper, TextField, Button } from '@mui/material';
import { Bar, Line } from 'react-chartjs-2';
import axios from 'axios';
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
  Filler
} from 'chart.js';

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

function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fechaInicio: firstDay.toISOString().slice(0, 10),
    fechaFin:    lastDay.toISOString().slice(0, 10),
  };
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style:            'currency',
  currency:         'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: { size: 16, family: 'Arial' },
        color: '#333'
      }
    },
    title: {
      display: true,
      text: 'Ingresos y Egresos Totales',
      font: { size: 24, weight: 'bold' },
      color: '#222'
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      titleFont: { size: 16, weight: 'bold' },
      bodyFont: { size: 14 }
    }
  },
  animation: { duration: 1500, easing: 'easeInOutQuart' },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.1)' },
      title: { display: true, text: 'Monto en USD', color: '#333' }
    },
    x: {
      grid: { color: 'rgba(0,0,0,0.1)' },
      title: { display: true, text: 'Fecha', color: '#333' }
    }
  }
};

const Dashboard = () => {
  const defaultRange = getDefaultDateRange();
  const [dateRange, setDateRange] = useState(defaultRange);

  const [kpis, setKpis] = useState({
    ingreso_total:       0,
    abonos_totales:      0,
    egreso_total:        0,
    balance_general:     0,
    tramites_mensuales:  0,
    saldo_restante:      0,
    totalEfectivo:       0,
    totalTransferencia:  0
  });

  const [chartDataIngresos, setChartDataIngresos] = useState({ labels: [], datasets: [] });
  const [chartDataTramites, setChartDataTramites]   = useState({ labels: [], datasets: [] });

  const [clientes, setClientes] = useState([]);

  // 1) Fetch KPIs from API
  const fetchKpis = useCallback(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/kpis', { params: dateRange })
      .then(response => {
        setKpis(response.data);
      })
      .catch(error => console.error('Error al cargar KPI:', error));
  }, [dateRange]);

  // 2) Fetch chart data from API
  const fetchChartData = useCallback(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/kpis/chart', { params: dateRange })
      .then(response => {
        // set data for ingresos/egresos bar chart
        setChartDataIngresos({
          labels: response.data.labels.map(l => l.split('T')[0]),
          datasets: [
            {
              label: 'Ingresos Totales',
              data: response.data.ingresos,
              backgroundColor: 'rgba(54, 162, 235, 0.7)',
              borderColor:     'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              borderRadius: 8
            },
            {
              label: 'Egresos Totales',
              data: response.data.egresos,
              backgroundColor: 'rgba(255, 99, 132, 0.7)',
              borderColor:     'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              borderRadius: 8
            }
          ]
        });
        // set data for trámites line chart
        setChartDataTramites({
          labels: response.data.labels.map(l => l.split('T')[0]),
          datasets: [
            {
              label: 'Trámites Diarios',
              data: response.data.tramites,
              borderColor: 'rgba(255, 206, 86, 1)',
              backgroundColor: 'rgba(255, 206, 86, 0.6)',
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointBackgroundColor: 'rgba(255, 206, 86, 1)',
              pointHoverRadius: 7
            }
          ]
        });
      })
      .catch(error => console.error('Error al cargar datos del gráfico:', error));
  }, [dateRange]);

  // 3) Fetch all clientes to compute total saldo restante
  const fetchClientes = useCallback(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/clientes')
      .then(res => setClientes(res.data))
      .catch(err => console.error('Error al cargar clientes:', err));
  }, []);

  useEffect(() => {
    fetchKpis();
    fetchChartData();
    fetchClientes();
  }, [fetchKpis, fetchChartData, fetchClientes]);

  const handleDateChange = e => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  // Compute sum of 'restante' across all clientes
  const totalSaldoRestante = clientes
    .reduce((sum, c) => sum + Number(c.restante || 0), 0);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Dashboard
      </Typography>

      {/* Date filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Fecha Inicio"
          type="date"
          name="fechaInicio"
          value={dateRange.fechaInicio}
          onChange={handleDateChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Fecha Fin"
          type="date"
          name="fechaFin"
          value={dateRange.fechaFin}
          onChange={handleDateChange}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="contained"
          onClick={() => {
            fetchKpis();
            fetchChartData();
            fetchClientes();
          }}
        >
          Actualizar
        </Button>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2}>
        {[
          { title: 'Ingreso Total',            value: kpis.ingreso_total      },
          { title: 'Abonos Totales',           value: kpis.abonos_totales     },
          { title: 'Egreso Total',             value: kpis.egreso_total       },
          { title: 'Balance',                  value: kpis.balance_general    },
          { title: 'Trámites Mensuales',       value: kpis.tramites_mensuales, format: false },
          { title: 'Saldo Restante',           value: totalSaldoRestante     },
          { title: 'Efectivo recibido',        value: kpis.totalEfectivo      },
          { title: 'Transferencias recibidas', value: kpis.totalTransferencia }
        ].map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <Paper elevation={4} sx={{ p: 3, textAlign: 'center', backgroundColor: '#f7f7f7' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {kpi.title}
              </Typography>
              <Typography variant="h5" sx={{ color: '#333' }}>
                {kpi.format === false
                  ? kpi.value
                  : currencyFormatter.format(kpi.value || 0)
                }
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ p: 2 }}>
            <Bar data={chartDataIngresos} options={chartOptions} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ p: 2 }}>
            <Line data={chartDataTramites} options={chartOptions} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
