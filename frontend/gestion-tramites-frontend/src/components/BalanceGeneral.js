// src/components/BalanceGeneral.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid } from '@mui/material';
import axios from 'axios';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';

const BalanceGeneral = () => {
  // Inicializar fechas del mes actual
  const defaultRange = getDefaultDateRange();
  const [dateRange, setDateRange] = useState({
    fechaInicio: defaultRange.fechaInicio,
    fechaFin: defaultRange.fechaFin,
  });
  const [balance, setBalance] = useState(null);

  const fetchBalance = () => {
    axios.get('http://localhost:5000/api/kpis', { params: dateRange })
      .then(response => setBalance(response.data.balance_general))
      .catch(error => console.error('Error al cargar balance:', error));
  };

  useEffect(() => {
    fetchBalance();
  }, [dateRange]);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
        Balance General
      </Typography>
      <Grid container alignItems="center" spacing={2}>
        <Grid item xs={12} sm={8}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Fecha Inicio"
              type="date"
              name="fechaInicio"
              value={dateRange.fechaInicio}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', sm: '180px' } }}
            />
            <TextField
              label="Fecha Fin"
              type="date"
              name="fechaFin"
              value={dateRange.fechaFin}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', sm: '180px' } }}
            />
            <Button variant="contained" onClick={fetchBalance} sx={{ height: '56px' }}>
              Actualizar Balance
            </Button>
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="h5">
            {balance !== null ? (
              <>
                <strong>Balance:</strong>{' '}
                {currencyFormatter.format(parseFloat(balance))}
              </>
            ) : (
              'Cargando...'
            )}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BalanceGeneral;
