// 3) Nuevo componente React: src/components/RepartoSocios.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper,
  TextField, Button, MenuItem
} from '@mui/material';
import axios from 'axios';

const socios = ['Liz', 'Alberto'];

export default function RepartoSocios() {
  const [fechas, setFechas] = useState({
    fechaInicio: new Date().toISOString().slice(0,10),
    fechaFin:    new Date().toISOString().slice(0,10)
  });
  const [data, setData] = useState({
    utilidadNeta: 0,
    parteLiz: 0,
    parteAlberto: 0,
    retiradoLiz: 0,
    retiradoAlberto: 0
  });
  const [retiro, setRetiro] = useState({
    socio: 'Liz',
    monto: '',
    fecha: new Date().toISOString().slice(0,10)
  });

  const fetchReparto = () => {
    axios.get('/api/finanzas/reparto', { params: fechas })
      .then(res => setData(res.data))
      .catch(console.error);
  };

  useEffect(fetchReparto, [fechas]);

  const handleRetiroSubmit = e => {
    e.preventDefault();
    axios.post('/api/finanzas/retiros', retiro)
      .then(() => {
        setRetiro({ ...retiro, monto: '' });
        fetchReparto();
      })
      .catch(console.error);
  };

  return (
    <Box mt={4}>
      <Typography variant="h5" gutterBottom>Reparto de Utilidades</Typography>

      {/* Filtros de fecha */}
      <Box sx={{ display:'flex', gap:2, mb:2 }}>
        <TextField
          label="Desde" type="date"
          value={fechas.fechaInicio}
          onChange={e => setFechas({...fechas, fechaInicio: e.target.value})}
          InputLabelProps={{ shrink:true }}
        />
        <TextField
          label="Hasta" type="date"
          value={fechas.fechaFin}
          onChange={e => setFechas({...fechas, fechaFin: e.target.value})}
          InputLabelProps={{ shrink:true }}
        />
        <Button variant="outlined" onClick={fetchReparto}>Actualizar</Button>
      </Box>

      {/* Formulario de retiros */}
      <Box component="form" onSubmit={handleRetiroSubmit} sx={{ display:'flex', gap:2, mb:4 }}>
        <TextField
          select label="Socio" size="small" value={retiro.socio}
          onChange={e => setRetiro({...retiro, socio: e.target.value})}
        >
          {socios.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField
          label="Monto" type="number" size="small"
          value={retiro.monto}
          onChange={e => setRetiro({...retiro, monto: e.target.value})}
        />
        <TextField
          label="Fecha" type="date" size="small"
          value={retiro.fecha}
          onChange={e => setRetiro({...retiro, fecha: e.target.value})}
          InputLabelProps={{ shrink:true }}
        />
        <Button type="submit" variant="contained">Registrar</Button>
      </Box>

      {/* Panel de reparto */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography>Total utilidad neta: ${data.utilidadNeta.toLocaleString()}</Typography>
          </Paper>
        </Grid>
        {['Liz','Alberto'].map(s => (
          <Grid key={s} item xs={12} sm={6}>
            <Paper sx={{ p:2 }}>
              <Typography>{s}</Typography>
              <Typography>Retirado: ${data[`retirado${s}`].toLocaleString()}</Typography>
              <Typography>Disponible: ${data[`parte${s}`].toLocaleString()}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
);
}
