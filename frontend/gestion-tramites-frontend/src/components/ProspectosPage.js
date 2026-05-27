import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PriorityHighOutlinedIcon from '@mui/icons-material/PriorityHighOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import api from '../services/api';
import EntryPanelDrawer from './ui/EntryPanelDrawer';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import MetricCard from './ui/MetricCard';
import PageHeader from './ui/PageHeader';
import ProspectChip from './ui/ProspectChip';
import SectionCard from './ui/SectionCard';
import ProspectoForm from './ProspectoForm';
import {
  formatDate,
  getProspectStatusLabel,
  isFollowUpDue,
  PROSPECT_PRIORITY_OPTIONS,
  PROSPECT_STATUS_OPTIONS,
} from '../utils/prospectUtils';

function ProspectosPage() {
  const [prospectos, setProspectos] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [selectedProspecto, setSelectedProspecto] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  const cargarProspectos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/prospectos');
      setProspectos(response.data);
    } catch (requestError) {
      console.error('Error al cargar prospectos:', requestError);
      setError('No fue posible cargar los prospectos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProspectos();
  }, [cargarProspectos]);

  const filteredProspectos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return prospectos.filter((prospecto) => {
      const matchesSearch = !normalizedSearch || [
        prospecto.nombre,
        prospecto.telefono,
        prospecto.email,
        prospecto.interes,
        prospecto.origen,
        prospecto.notas,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === 'todos' || prospecto.estado === statusFilter;
      const matchesPriority = priorityFilter === 'todos' || prospecto.prioridad === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, prospectos, search, statusFilter]);

  const metrics = useMemo(() => {
    const activos = prospectos.filter((prospecto) => !['descartado', 'convertido'].includes(prospecto.estado));
    return {
      total: prospectos.length,
      alta: prospectos.filter((prospecto) => prospecto.prioridad === 'alta').length,
      vencidos: activos.filter((prospecto) => isFollowUpDue(prospecto.fecha_proximo_seguimiento)).length,
      convertidos: prospectos.filter((prospecto) => prospecto.estado === 'convertido').length,
    };
  }, [prospectos]);

  const handleNew = () => {
    setSelectedProspecto(null);
    setDrawerOpen(true);
  };

  const handleEdit = (prospecto) => {
    setSelectedProspecto(prospecto);
    setDrawerOpen(true);
  };

  const handleSaved = (prospectoGuardado) => {
    setProspectos((current) => {
      const exists = current.some((prospecto) => prospecto.id === prospectoGuardado.id);
      if (exists) {
        return current.map((prospecto) => (prospecto.id === prospectoGuardado.id ? prospectoGuardado : prospecto));
      }
      return [prospectoGuardado, ...current];
    });
    setDrawerOpen(false);
    setSelectedProspecto(null);
    setFeedback({
      open: true,
      severity: 'success',
      message: 'Prospecto guardado correctamente.',
    });
  };

  const handleDelete = async (prospectoId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este prospecto?')) {
      return;
    }

    try {
      await api.delete(`/api/prospectos/${prospectoId}`);
      setProspectos((current) => current.filter((prospecto) => prospecto.id !== prospectoId));
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Prospecto eliminado correctamente.',
      });
    } catch (deleteError) {
      console.error('Error al eliminar prospecto:', deleteError);
      setFeedback({
        open: true,
        severity: 'error',
        message: deleteError.response?.data?.error || 'No se pudo eliminar el prospecto.',
      });
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Prospección"
        title="Prospectos"
        subtitle="Seguimiento de leads antes de convertirlos en clientes."
        actions={(
          <Button variant="contained" startIcon={<PersonSearchOutlinedIcon />} onClick={handleNew}>
            Nuevo prospecto
          </Button>
        )}
      />

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Prospectos"
            value={String(metrics.total)}
            helper="Leads registrados."
            icon={<GroupsOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Prioridad alta"
            value={String(metrics.alta)}
            helper="Requieren atención pronta."
            icon={<PriorityHighOutlinedIcon />}
            tone="accent"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Seguimientos vencidos"
            value={String(metrics.vencidos)}
            helper="Con fecha para hoy o anterior."
            icon={<TodayOutlinedIcon />}
            tone="accent"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Convertidos"
            value={String(metrics.convertidos)}
            helper="Marcados como cliente ganado."
            icon={<TaskAltOutlinedIcon />}
            tone="success"
          />
        </Grid>
      </Grid>

      <SectionCard
        title="Leads y seguimiento"
        subtitle="Clasifica por estado, prioridad y próxima acción."
        actions={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', lg: 'auto' } }}>
            <TextField
              label="Buscar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 240 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              label="Estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 170 } }}
            >
              <MenuItem value="todos">Todos</MenuItem>
              {PROSPECT_STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Prioridad"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 150 } }}
            >
              <MenuItem value="todos">Todas</MenuItem>
              {PROSPECT_PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      >
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mostrando {filteredProspectos.length} de {prospectos.length} prospectos.
        </Typography>

        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            '& table': {
              minWidth: { xs: 920, md: '100%' },
            },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Prospecto</TableCell>
                <TableCell>Contacto</TableCell>
                <TableCell>Interés</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Seguimiento</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Stack spacing={2} alignItems="center">
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        Cargando prospectos...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : filteredProspectos.length > 0 ? (
                filteredProspectos.map((prospecto) => {
                  const due = isFollowUpDue(prospecto.fecha_proximo_seguimiento)
                    && !['descartado', 'convertido'].includes(prospecto.estado);
                  return (
                    <TableRow key={prospecto.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {prospecto.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {prospecto.notas ? prospecto.notas.slice(0, 70) : 'Sin notas'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{prospecto.telefono}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {prospecto.email || 'Sin correo'}
                        </Typography>
                      </TableCell>
                      <TableCell>{prospecto.interes || '-'}</TableCell>
                      <TableCell>{prospecto.origen || '-'}</TableCell>
                      <TableCell>
                        <ProspectChip value={prospecto.estado} />
                      </TableCell>
                      <TableCell>
                        <ProspectChip type="priority" value={prospecto.prioridad} />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: due ? 800 : 500, color: due ? 'error.main' : 'text.primary' }}
                        >
                          {formatDate(prospecto.fecha_proximo_seguimiento)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {due ? 'Pendiente' : getProspectStatusLabel(prospecto.estado)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar prospecto">
                          <IconButton onClick={() => handleEdit(prospecto)}>
                            <EditIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar prospecto">
                          <IconButton onClick={() => handleDelete(prospecto.id)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1">No hay prospectos para este filtro.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Ajusta la búsqueda, estado o prioridad.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <EntryPanelDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedProspecto(null);
        }}
        title={selectedProspecto ? 'Editar prospecto' : 'Nuevo prospecto'}
        subtitle="Registra contacto, origen, prioridad y la siguiente acción comercial."
      >
        {drawerOpen ? (
          <ProspectoForm
            prospecto={selectedProspecto}
            onSaved={handleSaved}
            onCancel={() => {
              setDrawerOpen(false);
              setSelectedProspecto(null);
            }}
          />
        ) : null}
      </EntryPanelDrawer>

      <FeedbackSnackbar
        open={feedback.open}
        severity={feedback.severity}
        message={feedback.message}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
      />
    </Box>
  );
}

export default ProspectosPage;
