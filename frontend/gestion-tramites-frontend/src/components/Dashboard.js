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
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

function getDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fechaInicio: firstDay.toISOString().slice(0, 10),
    fechaFin: lastDay.toISOString().slice(0, 10),
  };
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 16
        },
        color: '#333'
      }
    },
    title: {
      display: true,
      text: 'Ingresos y Egresos Totales',
      font: {
        size: 20
      },
      color: '#222'
    }
  },
  animation: {
    duration: 1500,
    easing: 'easeInOutBounce'
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0,0,0,0.1)'
      },
      title: {
        display: true,
        text: 'Monto en USD',
        color: '#333'
      }
    },
    x: {
      grid: {
        color: 'rgba(0,0,0,0.1)'
      }
    }
  }
};

const Dashboard = () => {
  const defaultRange = getDefaultDateRange();
  const [dateRange, setDateRange] = useState({
    fechaInicio: defaultRange.fechaInicio,
    fechaFin: defaultRange.fechaFin,
  });

  const [kpis, setKpis] = useState({
    ingreso_total: 0,
    abonos_totales: 0,
    egreso_total: 0,
    balance_general: 0,
    tramites_mensuales: 0,
    saldo_restante: 0,
  });

  const [chartDataIngresos, setChartDataIngresos] = useState({ labels: [], datasets: [] });
  const [chartDataTramites, setChartDataTramites] = useState({ labels: [], datasets: [] });

  const fetchKpis = useCallback(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/kpis', {
      params: dateRange
    })
      .then(response => setKpis(response.data))
      .catch(error => console.error('Error al cargar KPI:', error));
  }, [dateRange]);

  const fetchChartData = useCallback(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/kpis/chart', {
      params: dateRange
    })
      .then(response => {
        setChartDataIngresos({
          labels: response.data.labels,
          datasets: [
            {
              label: 'Ingresos Totales',
              data: response.data.ingresos,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
            },
            {
              label: 'Egresos Totales',
              data: response.data.egresos,
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
            }
          ],
        });

        setChartDataTramites({
          labels: response.data.labels,
          datasets: [
            {
              label: 'Trámites Diarios',
              data: response.data.tramites,
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              fill: true,
              tension: 0.4
            }
          ],
        });
      })
      .catch(error => console.error('Error al cargar datos del gráfico:', error));
  }, [dateRange]);

  useEffect(() => {
    fetchKpis();
    fetchChartData();
  }, [fetchKpis, fetchChartData]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Dashboard
      </Typography>

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
        <Button variant="contained" onClick={() => { fetchKpis(); fetchChartData(); }}>
          Actualizar
        </Button>
      </Box>

      <Grid container spacing={2}>
        {[
          { title: 'Ingreso Total', value: kpis.ingreso_total, format: true },
          { title: 'Abonos Totales', value: kpis.abonos_totales, format: true },
          { title: 'Egreso Total', value: kpis.egreso_total, format: true },
          { title: 'Balance', value: kpis.balance_general, format: true },
          { title: 'Trámites Mensuales', value: kpis.tramites_mensuales, format: false },
          { title: 'Saldo Restante', value: kpis.saldo_restante, format: true },
        ].map((kpi, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Paper elevation={4} sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {kpi.title}
              </Typography>
              <Typography variant="h5" sx={{ color: '#555555' }}>
                {kpi.format
                  ? currencyFormatter.format(kpi.value)
                  : kpi.value
                }
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Bar data={chartDataIngresos} options={chartOptions} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Line data={chartDataTramites} options={chartOptions} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
