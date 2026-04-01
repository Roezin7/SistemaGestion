import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
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
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
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

function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('nombre');
  const [order, setOrder] = useState('asc');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false);
  const [verInfoModalOpen, setVerInfoModalOpen] = useState(false);
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
    return clientes.filter((cliente) =>
      cliente.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (cliente.numero_recibo && cliente.numero_recibo.toLowerCase().includes(search.toLowerCase()))
    );
  }, [clientes, search]);

  const sortedClientes = useMemo(() => {
    const collection = [...filteredClientes];
    return collection.sort((a, b) => {
      if (orderBy === 'nombre') {
        return order === 'asc' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
      }
      if (orderBy === 'numero_recibo') {
        return order === 'asc'
          ? (a.numero_recibo || '').localeCompare(b.numero_recibo || '')
          : (b.numero_recibo || '').localeCompare(a.numero_recibo || '');
      }
      if (orderBy === 'integrantes') {
        return order === 'asc'
          ? Number(a.integrantes || 0) - Number(b.integrantes || 0)
          : Number(b.integrantes || 0) - Number(a.integrantes || 0);
      }
      if (orderBy === 'restante') {
        return order === 'asc'
          ? Number(a.restante || 0) - Number(b.restante || 0)
          : Number(b.restante || 0) - Number(a.restante || 0);
      }
      return 0;
    });
  }, [filteredClientes, order, orderBy]);

  const totalIntegrantes = clientes.reduce((sum, cliente) => sum + Number(cliente.integrantes || 0), 0);
  const saldoPendiente = clientes.reduce((sum, cliente) => sum + Number(cliente.restante || 0), 0);

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
        eyebrow="Cartera activa"
        title="Clientes"
        subtitle="Administra expedientes, consulta estados, adjunta documentación y mantén visibilidad del saldo pendiente por cliente."
      />

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <MetricCard
            label="Clientes registrados"
            value={String(clientes.length)}
            helper="Expedientes actualmente almacenados en el sistema."
            icon={<Inventory2OutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            label="Integrantes acumulados"
            value={String(totalIntegrantes)}
            helper="Suma de integrantes reportados en la cartera."
            icon={<Groups2OutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            label="Saldo pendiente"
            value={currencyFormatter.format(saldoPendiente)}
            helper="Pendiente total por cobrar según la ficha de clientes."
            icon={<QueryStatsOutlinedIcon />}
            tone="accent"
          />
        </Grid>
      </Grid>

      <ClienteForm onClienteAgregado={(nuevoCliente) => setClientes((current) => [...current, nuevoCliente])} />

      <SectionCard
        title="Listado de clientes"
        subtitle="Filtra por nombre o número de recibo y trabaja desde la misma tabla con acciones directas."
        actions={
          <TextField
            label="Buscar cliente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        }
      >
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mostrando {sortedClientes.length} de {clientes.length} clientes.
        </Typography>

        <TableContainer>
          <Table>
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
                <TableCell>Estado</TableCell>
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
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1">No hay clientes que coincidan con la búsqueda.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Prueba con otro nombre, otro número de recibo o registra un nuevo expediente.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

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
