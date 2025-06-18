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
  // **1) Inicialización de estados**
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

  // **2) Función para obtener datos de reparto y retiros**
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

  // **3) Registrar un nuevo retiro**
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

  // **4) Eliminar un retiro existente**
  const handleDelete = id => {
    axios.delete(`/api/finanzas/retiros/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(fetchReparto)
    .catch(console.error);
  };

  return (
    <Box mt={4}>
      {/* **Título Principal** */}
      <Typography variant="h5" gutterBottom>
        <strong>Reparto de Utilidades</strong>
      </Typography>

      {/* **Sección de Filtros de Fecha** */}
      <Box sx={{ display:'flex', gap:2, mb:2 }}>
        <Typography variant="subtitle1"><strong>Filtros de Fecha:</strong></Typography>
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
        <Button variant="outlined" onClick={fetchReparto}>
          <strong>Actualizar</strong>
        </Button>
      </Box>

      {/* **Formulario de Retiros** */}
      <Box component="form" onSubmit={handleRetiroSubmit}
           sx={{ display:'flex', gap:2, mb:4, alignItems:'center' }}>
        <Typography variant="subtitle1"><strong>Registrar Retiro:</strong></Typography>
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
        <Button type="submit" variant="contained">
          <strong>Registrar</strong>
        </Button>
      </Box>

      {/* **Lista de Retiros Registrados** */}
      <Box mb={4}>
        <Typography variant="h6"><strong>Retiros Registrados</strong></Typography>
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
                primary={
                  <>
                    <strong>{r.socio}:</strong> ${Number(r.monto).toLocaleString()}
                  </>
                }
                secondary={r.fecha}
              />
            </ListItem>
          ))}
          {listaRetiros.length === 0 && (
            <Typography color="text.secondary">
              <em>No hay retiros en este periodo.</em>
            </Typography>
          )}
        </List>
      </Box>

      {/* **Panel de Reparto** */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography>
              <strong>Total utilidad neta:</strong> ${data.utilidadNeta.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        {['Liz','Alberto'].map(s => (
          <Grid key={s} item xs={12} sm={6}>
            <Paper sx={{ p:2 }}>
              <Typography><strong>{s}</strong></Typography>
              <Typography>
                <strong>Retirado:</strong> ${data[`retirado${s}`].toLocaleString()}
              </Typography>
              <Typography>
                <strong>Disponible:</strong> ${data[`parte${s}`].toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
