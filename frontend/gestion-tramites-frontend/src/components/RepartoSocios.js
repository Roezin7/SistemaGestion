// src/components/RepartoSocios.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const socios = ['Liz', 'Alberto'];

function getLastMonthRange() {
  const now = new Date();
  const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrev  = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    fechaInicio: firstDayPrev.toISOString().slice(0,10),
    fechaFin:    lastDayPrev.toISOString().slice(0,10)
  };
}

export default function RepartoSocios() {
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

  const handleDelete = id => {
    axios.delete(`/api/finanzas/retiros/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(fetchReparto)
    .catch(console.error);
  };

  return (
    <Box p={2} mb={4} sx={{ backgroundColor: '#f9f9f9', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
        Reparto de Utilidades
      </Typography>

      {/* Formulario de Retiro */}
      <Box
        component="form"
        onSubmit={handleRetiroSubmit}
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          mb: 3,
          alignItems: 'center'
        }}
      >
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="socio-label"><strong>Socio</strong></InputLabel>
          <Select
            labelId="socio-label"
            label="Socio"
            name="socio"
            value={retiro.socio}
            onChange={e => setRetiro({ ...retiro, socio: e.target.value })}
          >
            {socios.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          label={<strong>Monto</strong>}
          name="monto"
          type="number"
          size="small"
          value={retiro.monto}
          onChange={e => setRetiro({ ...retiro, monto: e.target.value })}
          sx={{ minWidth: 150 }}
        />

        <TextField
          label={<strong>Fecha</strong>}
          name="fecha"
          type="date"
          size="small"
          value={retiro.fecha}
          onChange={e => setRetiro({ ...retiro, fecha: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />

        <Button type="submit" variant="contained">
          Registrar Retiro
        </Button>
      </Box>

      {/* Lista de Retiros */}
      <Box mb={4}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
          Retiros Registrados
        </Typography>
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
                    <strong>{r.socio}</strong>: <strong>${Number(r.monto).toLocaleString()}</strong>
                  </>
                }
                secondary={r.fecha}
              />
            </ListItem>
          ))}
          {listaRetiros.length === 0 && (
            <Typography color="text.secondary">
              No hay retiros en este periodo.
            </Typography>
          )}
        </List>
      </Box>

      {/* Panel de Reparto */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Utilidad Neta
            </Typography>
            <Typography variant="h6">
              ${data.utilidadNeta.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        {socios.map(s => (
          <Grid item xs={12} sm={6} key={s}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {s}
              </Typography>
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
