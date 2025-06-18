// src/components/RepartoSocios.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper,
  TextField, Button, MenuItem,
  List, ListItem, ListItemText,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const socios = ['Liz', 'Alberto'];

function getLastMonthRange() {
  const now = new Date();
  const firstDayPrev = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayPrev  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fechaInicio: firstDayPrev.toISOString().slice(0,10),
    fechaFin:    lastDayPrev.toISOString().slice(0,10)
  };
}

export default function RepartoSocios() {
  // 1) Inicializa fechas en mes pasado
  const [fechas, setFechas] = useState(getLastMonthRange());

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

  const [listaRetiros, setListaRetiros] = useState([]);

  const token = localStorage.getItem('token');

  // 2) Fetch reparto y lista de retiros
  const fetchReparto = () => {
    axios.get('/api/finanzas/reparto', {
      params: fechas,
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setData(res.data))
    .catch(console.error);

    axios.get('/api/finanzas/retiros', {
      params: fechas,
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setListaRetiros(res.data))
    .catch(console.error);
  };

  useEffect(fetchReparto, [fechas]);

  // 3) Registrar nuevo retiro
  const handleRetiroSubmit = e => {
    e.preventDefault();
    axios.post('/api/finanzas/retiros', retiro, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      setRetiro({ ...retiro, monto: '' });
      fetchReparto();
    })
    .catch(console.error);
  };

  // 4) Eliminar retiro
  const handleDelete = id => {
    axios.delete(`/api/finanzas/retiros/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(fetchReparto)
    .catch(console.error);
  };

  return (
    <Box mt={4}>
      <Typography variant="h5" gutterBottom>Reparto de Utilidades</Typography>

      {/* 🔎 Filtros de fecha */}
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

      {/* ➕ Formulario de retiros */}
      <Box component="form" onSubmit={handleRetiroSubmit}
           sx={{ display:'flex', gap:2, mb:4, alignItems:'center' }}>
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

      {/* 🗒 Lista de retiros con opción a borrar */}
      <Box mb={4}>
        <Typography variant="h6">Retiros Registrados</Typography>
        <List>
          {listaRetiros.map(r => (
            <ListItem
              key={r.id}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleDelete(r.id)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={`${r.socio}: $${Number(r.monto).toLocaleString()}`}
                secondary={r.fecha}
              />
            </ListItem>
          ))}
          {listaRetiros.length === 0 && (
            <Typography color="text.secondary">No hay retiros en este periodo.</Typography>
          )}
        </List>
      </Box>

      {/* 📊 Panel de reparto */}
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
