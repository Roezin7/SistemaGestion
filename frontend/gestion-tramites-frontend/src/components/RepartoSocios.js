import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import api from '../services/api';
import { currencyFormatter } from '../utils/formatUtils';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import MetricCard from './ui/MetricCard';
import SectionCard from './ui/SectionCard';

const socios = ['Liz', 'Alberto'];

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fechaInicio: firstDay.toISOString().slice(0, 10),
    fechaFin: lastDay.toISOString().slice(0, 10),
  };
}

function RepartoSocios() {
  const [fechas, setFechas] = useState(getCurrentMonthRange());
  const [data, setData] = useState({
    utilidadNeta: 0,
    parteLiz: 0,
    parteAlberto: 0,
    retiradoLiz: 0,
    retiradoAlberto: 0,
  });
  const [retiro, setRetiro] = useState({
    socio: 'Liz',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
  });
  const [listaRetiros, setListaRetiros] = useState([]);
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  const fetchReparto = useCallback(async () => {
    try {
      const [repartoResponse, retirosResponse] = await Promise.all([
        api.get('/api/finanzas/reparto', { params: fechas }),
        api.get('/api/finanzas/retiros', { params: fechas }),
      ]);
      setData(repartoResponse.data);
      setListaRetiros(retirosResponse.data);
    } catch (error) {
      console.error(error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo cargar el reparto entre socios.',
      });
    }
  }, [fechas]);

  useEffect(() => {
    fetchReparto();
  }, [fetchReparto]);

  const handleRetiroSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/api/finanzas/retiros', retiro);
      setRetiro((current) => ({ ...current, monto: '' }));
      await fetchReparto();
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Retiro registrado correctamente.',
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo registrar el retiro.',
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/finanzas/retiros/${id}`);
      await fetchReparto();
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Retiro eliminado correctamente.',
      });
    } catch (error) {
      console.error(error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo eliminar el retiro.',
      });
    }
  };

  return (
    <>
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <MetricCard
            label="Utilidad neta"
            value={currencyFormatter.format(Number(data.utilidadNeta || 0))}
            icon={<AccountBalanceOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            label="Disponible Liz"
            value={currencyFormatter.format(Number(data.parteLiz || 0))}
            icon={<SavingsOutlinedIcon />}
            tone="success"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            label="Disponible Alberto"
            value={currencyFormatter.format(Number(data.parteAlberto || 0))}
            icon={<PaymentsOutlinedIcon />}
            tone="accent"
          />
        </Grid>
      </Grid>

      <SectionCard
        title="Reparto de utilidades"
        subtitle="Utilidad neta y retiros aplicados en el rango."
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Fecha inicial"
              type="date"
              value={fechas.fechaInicio}
              onChange={(event) => setFechas((current) => ({ ...current, fechaInicio: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Fecha final"
              type="date"
              value={fechas.fechaFin}
              onChange={(event) => setFechas((current) => ({ ...current, fechaFin: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button variant="outlined" onClick={fetchReparto} fullWidth sx={{ height: '100%' }}>
              Actualizar reparto
            </Button>
          </Grid>
        </Grid>

        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} lg={5}>
            <SectionCard
              title="Registrar retiro"
              subtitle="Captura un retiro del periodo."
              sx={{ height: '100%' }}
            >
              <Grid container spacing={2} component="form" onSubmit={handleRetiroSubmit}>
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Socio"
                    value={retiro.socio}
                    onChange={(event) => setRetiro((current) => ({ ...current, socio: event.target.value }))}
                    fullWidth
                  >
                    {socios.map((socio) => (
                      <MenuItem key={socio} value={socio}>
                        {socio}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Monto"
                    type="number"
                    value={retiro.monto}
                    onChange={(event) => setRetiro((current) => ({ ...current, monto: event.target.value }))}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Fecha"
                    type="date"
                    value={retiro.fecha}
                    onChange={(event) => setRetiro((current) => ({ ...current, fecha: event.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" fullWidth>
                    Registrar retiro
                  </Button>
                </Grid>
              </Grid>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={7}>
            <SectionCard
              title="Retiros registrados"
              subtitle="Movimientos del periodo consultado."
              sx={{ height: '100%' }}
            >
              {listaRetiros.length ? (
                <List disablePadding>
                  {listaRetiros.map((item) => (
                    <ListItem
                      key={item.id}
                      divider
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleDelete(item.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${item.socio} · ${currencyFormatter.format(Number(item.monto || 0))}`}
                        secondary={String(item.fecha).slice(0, 10)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay retiros registrados en este periodo.
                </Typography>
              )}
              <Grid container spacing={2} sx={{ mt: 1.5 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Liz</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Retirado: {currencyFormatter.format(Number(data.retiradoLiz || 0))}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1, fontWeight: 800 }}>
                      Disponible: {currencyFormatter.format(Number(data.parteLiz || 0))}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Alberto</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Retirado: {currencyFormatter.format(Number(data.retiradoAlberto || 0))}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1, fontWeight: 800 }}>
                      Disponible: {currencyFormatter.format(Number(data.parteAlberto || 0))}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </SectionCard>
          </Grid>
        </Grid>
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

export default RepartoSocios;
