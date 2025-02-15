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
  Legend
} from 'chart.js';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
  // Fechas por defecto: mes actual
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

  // 1. Definimos fetchKpis con useCallback, dependiendo de dateRange
  const fetchKpis = useCallback(() => {
    axios
      .get('http://localhost:5000/api/kpis', { params: dateRange })
      .then((response) => setKpis(response.data))
      .catch((error) => console.error('Error al cargar KPI:', error));
  }, [dateRange]);

  // 2. Definimos fetchChartData con useCallback, también dependiendo de dateRange
  const fetchChartData = useCallback(() => {
    axios
      .get('http://localhost:5000/api/kpis/chart', { params: dateRange })
      .then((response) => {
        setChartDataIngresos({
          labels: response.data.labels,
          datasets: [
            {
              label: 'Ingresos Totales',
              data: response.data.ingresos,
              backgroundColor: '#06588a',
            },
            {
              label: 'Egresos Totales',
              data: response.data.egresos,
              backgroundColor: '#ff4081',
            },
          ],
        });

        setChartDataTramites({
          labels: response.data.labels,
          datasets: [
            {
              label: 'Trámites Diarios',
              data: response.data.tramites,
              borderColor: '#ffa500',
              fill: false,
              tension: 0.3,
            },
          ],
        });
      })
      .catch((error) => console.error('Error al cargar datos del gráfico:', error));
  }, [dateRange]);

  // 3. useEffect que llama a fetchKpis y fetchChartData
  //    Depende de [fetchKpis, fetchChartData], evitando warnings.
  useEffect(() => {
    fetchKpis();
    fetchChartData();
  }, [fetchKpis, fetchChartData]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  const currency = (val) => currencyFormatter.format(val);

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
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
        {/* KPIs */}
        <Grid item xs={6} sm={3}>
          <Paper 
            elevation={3}
            sx={{ p: 2, textAlign: 'center', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Typography variant="subtitle1">Ingreso Total</Typography>
            <Typography variant="h5">{currency(kpis.ingreso_total)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper 
            elevation={3}
            sx={{ p: 2, textAlign: 'center', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Typography variant="subtitle1">Abonos Totales</Typography>
            <Typography variant="h5">{currency(kpis.abonos_totales)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper 
            elevation={3}
            sx={{ p: 2, textAlign: 'center', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Typography variant="subtitle1">Egreso Total</Typography>
            <Typography variant="h5">{currency(kpis.egreso_total)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper 
            elevation={3}
            sx={{ p: 2, textAlign: 'center', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Typography variant="subtitle1">Balance</Typography>
            <Typography variant="h5">{currency(kpis.balance_general)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper 
            elevation={3}
            sx={{ p: 2, textAlign: 'center', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Typography variant="subtitle1">Trámites Mensuales</Typography>
            <Typography variant="h5">{kpis.tramites_mensuales}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper 
            elevation={3}
            sx={{ p: 2, textAlign: 'center', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.05)' } }}
          >
            <Typography variant="subtitle1">Saldo Restante (Clientes)</Typography>
            <Typography variant="h5">{currency(kpis.saldo_restante)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box mt={4}>
        {/* Gráfico de Barras: Ingresos vs Egresos */}
        <Paper elevation={3} sx={{ mb: 4 }}>
          <Typography variant="h6" align="center" sx={{ fontWeight: 'bold', pt: 2 }}>
            Ingresos vs. Egresos
          </Typography>
          <Bar
            data={chartDataIngresos}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Ingresos y Egresos Totales' },
              },
            }}
          />
        </Paper>

        {/* Gráfico de Línea: Trámites Diarios */}
        <Paper elevation={3}>
          <Typography variant="h6" align="center" sx={{ fontWeight: 'bold', pt: 2 }}>
            Trámites Diarios
          </Typography>
          <Line
            data={chartDataTramites}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Cantidad de Trámites por Día' },
              },
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
