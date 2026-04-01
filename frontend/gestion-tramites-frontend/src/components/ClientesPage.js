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
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ClienteForm from './ClienteForm';
import EditarClienteModal from './EditarClienteModal';
import SubirDocumentosModal from './SubirDocumentosModal';
import VerInformacionClienteModal from './VerInformacionClienteModal';
import api from '../services/api';
import { currencyFormatter } from '../utils/formatUtils';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import MetricCard from './ui/MetricCard';
import PageHeader from './ui/PageHeader';
import SectionCard from './ui/SectionCard';
import StatusChip from './ui/StatusChip';
import EntryPanelDrawer from './ui/EntryPanelDrawer';
import {
  buildStatusCounts,
  matchesStatusFilter,
  STATUS_FILTER_OPTIONS,
} from '../utils/statusUtils';

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [orderBy, setOrderBy] = useState('nombre');
  const [order, setOrder] = useState('asc');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false);
  const [verInfoModalOpen, setVerInfoModalOpen] = useState(false);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  const cargarClientes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/clientes');
      setClientes(response.data);
    } catch (requestError) {
      setError('No fue posible cargar la cartera de clientes.');
      console.error('Error al cargar clientes:', requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const filteredClientes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const matchesSearch = !normalizedSearch || [
        cliente.nombre,
        cliente.numero_recibo,
        cliente.estado_tramite,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchesStatus = matchesStatusFilter(cliente.estado_tramite, statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [clientes, search, statusFilter]);

  const sortedClientes = useMemo(() => {
    const collection = [...filteredClientes];
    return collection.sort((a, b) => {
      const direction = order === 'asc' ? 1 : -1;

      if (orderBy === 'numero_recibo') {
        return direction * String(a.numero_recibo || '').localeCompare(String(b.numero_recibo || ''), 'es', { sensitivity: 'base' });
      }

      if (orderBy === 'nombre') {
        return direction * String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
      }

      if (orderBy === 'estado_tramite') {
        return direction * String(a.estado_tramite || '').localeCompare(String(b.estado_tramite || ''), 'es', { sensitivity: 'base' });
      }

      if (orderBy === 'fecha_inicio_tramite') {
        const timeA = a.fecha_inicio_tramite ? new Date(a.fecha_inicio_tramite).getTime() : 0;
        const timeB = b.fecha_inicio_tramite ? new Date(b.fecha_inicio_tramite).getTime() : 0;
        return direction * (timeA - timeB);
      }

      if (orderBy === 'integrantes') {
        return direction * (Number(a.integrantes || 0) - Number(b.integrantes || 0));
      }

      if (orderBy === 'restante') {
        return direction * (Number(a.restante || 0) - Number(b.restante || 0));
      }

      return 0;
    });
  }, [filteredClientes, order, orderBy]);

  const saldoPendiente = clientes.reduce((sum, cliente) => sum + Number(cliente.restante || 0), 0);
  const statusCounts = useMemo(() => buildStatusCounts(clientes), [clientes]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleClienteActualizado = (clienteActualizado) => {
    setClientes((current) =>
      current.map((cliente) => (cliente.id === clienteActualizado.id ? clienteActualizado : cliente))
    );
  };

  const handleDeleteCliente = async (clienteId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este cliente?')) {
      return;
    }

    try {
      await api.delete(`/api/clientes/${clienteId}`);
      setClientes((current) => current.filter((cliente) => cliente.id !== clienteId));
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Cliente eliminado correctamente.',
      });
    } catch (deleteError) {
      console.error('Error al eliminar cliente:', deleteError);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo eliminar el cliente.',
      });
    }
  };

  const openModalFor = (cliente, target) => {
    setSelectedCliente(cliente);
    setEditarModalOpen(target === 'edit');
    setDocumentosModalOpen(target === 'docs');
    setVerInfoModalOpen(target === 'view');
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Clientes"
        title="Cartera"
        subtitle="Seguimiento de expedientes, estados y saldos."
        actions={(
          <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setRegistroOpen(true)}>
            Nuevo cliente
          </Button>
        )}
      />

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Total de clientes"
            value={String(clientes.length)}
            helper="Expedientes registrados."
            icon={<FolderOpenOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="En proceso"
            value={String(statusCounts.en_proceso)}
            helper="Expedientes activos."
            icon={<PendingActionsOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Concluidos"
            value={String(statusCounts.concluido)}
            helper="Expedientes terminados."
            icon={<TaskAltOutlinedIcon />}
            tone="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            label="Saldo pendiente"
            value={currencyFormatter.format(saldoPendiente)}
            helper="Pendiente total por cobrar."
            icon={<AccountBalanceWalletOutlinedIcon />}
            tone="accent"
          />
        </Grid>
      </Grid>

      <SectionCard
        title="Cartera de clientes"
        subtitle="Busca, filtra por estado y trabaja desde la misma tabla."
        actions={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', lg: 'auto' } }}>
            <TextField
              label="Buscar"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 280 } }}
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
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      >
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mostrando {sortedClientes.length} de {clientes.length} clientes.
        </Typography>

        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            '& table': {
              minWidth: { xs: 760, md: '100%' },
            },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'numero_recibo'}
                    direction={orderBy === 'numero_recibo' ? order : 'asc'}
                    onClick={() => handleRequestSort('numero_recibo')}
                  >
                    No. de recibo
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'nombre'}
                    direction={orderBy === 'nombre' ? order : 'asc'}
                    onClick={() => handleRequestSort('nombre')}
                  >
                    Cliente
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'integrantes'}
                    direction={orderBy === 'integrantes' ? order : 'asc'}
                    onClick={() => handleRequestSort('integrantes')}
                  >
                    Integrantes
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'estado_tramite'}
                    direction={orderBy === 'estado_tramite' ? order : 'asc'}
                    onClick={() => handleRequestSort('estado_tramite')}
                  >
                    Estado
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'fecha_inicio_tramite'}
                    direction={orderBy === 'fecha_inicio_tramite' ? order : 'asc'}
                    onClick={() => handleRequestSort('fecha_inicio_tramite')}
                  >
                    Inicio
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'restante'}
                    direction={orderBy === 'restante' ? order : 'asc'}
                    onClick={() => handleRequestSort('restante')}
                  >
                    Saldo restante
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Stack spacing={2} alignItems="center">
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        Cargando clientes...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : sortedClientes.length > 0 ? (
                sortedClientes.map((cliente) => (
                  <TableRow key={cliente.id} hover>
                    <TableCell>{cliente.numero_recibo || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {cliente.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>{cliente.integrantes || '—'}</TableCell>
                    <TableCell>
                      <StatusChip label={cliente.estado_tramite} />
                    </TableCell>
                    <TableCell>{cliente.fecha_inicio_tramite?.slice(0, 10) || '—'}</TableCell>
                    <TableCell align="right">{currencyFormatter.format(Number(cliente.restante || 0))}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar cliente">
                        <IconButton onClick={() => openModalFor(cliente, 'edit')}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Administrar documentos">
                        <IconButton onClick={() => openModalFor(cliente, 'docs')}>
                          <UploadFileIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver ficha detallada">
                        <IconButton onClick={() => openModalFor(cliente, 'view')}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar cliente">
                        <IconButton onClick={() => handleDeleteCliente(cliente.id)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1">No hay resultados para este filtro.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Ajusta la búsqueda o el estado seleccionado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      <EntryPanelDrawer
        open={registroOpen}
        onClose={() => setRegistroOpen(false)}
        title="Nuevo cliente"
        subtitle="Captura el expediente en un panel separado para mantener limpia la vista de cartera."
      >
        {registroOpen ? (
          <ClienteForm
            embedded
            onCancel={() => setRegistroOpen(false)}
            onClienteAgregado={(nuevoCliente) => setClientes((current) => [...current, nuevoCliente])}
          />
        ) : null}
      </EntryPanelDrawer>

      {selectedCliente ? (
        <>
          <EditarClienteModal
            open={editarModalOpen}
            onClose={() => setEditarModalOpen(false)}
            cliente={selectedCliente}
            onClienteUpdated={handleClienteActualizado}
          />
          <SubirDocumentosModal
            open={documentosModalOpen}
            onClose={() => setDocumentosModalOpen(false)}
            clienteId={selectedCliente.id}
          />
          <VerInformacionClienteModal
            open={verInfoModalOpen}
            onClose={() => setVerInfoModalOpen(false)}
            cliente={selectedCliente}
            onClienteUpdated={handleClienteActualizado}
          />
        </>
      ) : null}

      <FeedbackSnackbar
        open={feedback.open}
        severity={feedback.severity}
        message={feedback.message}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
      />
    </Box>
  );
}

export default ClientesPage;
