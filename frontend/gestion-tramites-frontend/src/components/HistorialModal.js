// src/components/HistorialModal.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import api from '../services/api';
import MetricCard from './ui/MetricCard';
import {
  buildHistoryMetrics,
  formatHistoryDateTime,
  getHistoryActionMeta,
  getHistoryModuleMeta,
  HISTORY_ACTION_OPTIONS,
  HISTORY_MODULE_OPTIONS,
  matchesHistoryFilters,
} from '../utils/historyUtils';

const HistorialModal = ({ open, onClose }) => {
  const [historial, setHistorial] = useState([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('todos');
  const [moduleFilter, setModuleFilter] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/auth/historial');
      setHistorial(response.data);
    } catch (requestError) {
      console.error('Error al cargar historial:', requestError);
      setError('No fue posible cargar el historial de cambios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      cargarHistorial();
    }
  }, [open, cargarHistorial]);

  const historialFiltrado = useMemo(() => (
    historial.filter((item) => matchesHistoryFilters(item, search, actionFilter, moduleFilter))
  ), [actionFilter, historial, moduleFilter, search]);

  const metrics = useMemo(() => buildHistoryMetrics(historialFiltrado), [historialFiltrado]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <HistoryRoundedIcon fontSize="small" />
          <Box>
            <Typography variant="inherit">Historial de cambios</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Vista de auditoría del sistema.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard label="Eventos visibles" value={String(metrics.total)} helper="Registros filtrados." />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard label="Hoy" value={String(metrics.todayCount)} helper="Actividad del día." />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard label="Usuarios" value={String(metrics.activeUsers)} helper="Usuarios con actividad." />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard
              label="Eliminaciones"
              value={String(metrics.deleteCount)}
              helper="Eventos destructivos visibles."
              tone="accent"
            />
          </Grid>
        </Grid>

        <Paper sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6">Actividad reciente</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Busca por usuario o descripción y filtra por acción o módulo.
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={cargarHistorial} disabled={loading}>
              Actualizar
            </Button>
          </Stack>

          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={12} md={5}>
              <TextField
                label="Buscar"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3.5}>
              <TextField
                select
                label="Acción"
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                fullWidth
              >
                {HISTORY_ACTION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3.5}>
              <TextField
                select
                label="Módulo"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                fullWidth
              >
                {HISTORY_MODULE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mostrando {historialFiltrado.length} de {historial.length} eventos.
          </Typography>

          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Descripción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Stack spacing={2} alignItems="center">
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                          Cargando historial...
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : historialFiltrado.length > 0 ? (
                  historialFiltrado.map((item) => {
                    const actionMeta = getHistoryActionMeta(item.descripcion);
                    const moduleMeta = getHistoryModuleMeta(item.descripcion, item.username);

                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>{formatHistoryDateTime(item.fecha)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.username || 'Sistema'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {moduleMeta.label}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              px: 1.25,
                              py: 0.5,
                              borderRadius: 999,
                              border: '1px solid',
                              borderColor:
                                actionMeta.tone === 'error'
                                  ? 'rgba(180, 35, 24, 0.18)'
                                  : actionMeta.tone === 'warning'
                                    ? 'rgba(181, 71, 8, 0.18)'
                                    : actionMeta.tone === 'success'
                                      ? 'rgba(15, 118, 110, 0.18)'
                                      : 'rgba(15, 23, 42, 0.10)',
                              backgroundColor:
                                actionMeta.tone === 'error'
                                  ? 'rgba(180, 35, 24, 0.06)'
                                  : actionMeta.tone === 'warning'
                                    ? 'rgba(181, 71, 8, 0.06)'
                                    : actionMeta.tone === 'success'
                                      ? 'rgba(15, 118, 110, 0.06)'
                                      : 'rgba(15, 23, 42, 0.04)',
                              color:
                                actionMeta.tone === 'error'
                                  ? '#b42318'
                                  : actionMeta.tone === 'warning'
                                    ? '#b54708'
                                    : actionMeta.tone === 'success'
                                      ? '#0f766e'
                                      : '#111827',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {actionMeta.label}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            {item.descripcion}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography variant="body1">No hay eventos para este filtro.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Ajusta búsqueda, acción o módulo.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HistorialModal;
