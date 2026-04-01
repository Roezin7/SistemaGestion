import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import api from '../services/api';
import { getDefaultDateRange } from '../utils/dateUtils';
import { currencyFormatter } from '../utils/formatUtils';
import EditarTransaccionModal from './EditarTransaccionModal';
import FeedbackSnackbar from './ui/FeedbackSnackbar';
import MetricCard from './ui/MetricCard';
import SectionCard from './ui/SectionCard';

const TYPE_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'abono', label: 'Abono' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'documento', label: 'Documento' },
];

function UltimasTransacciones({ refreshSignal }) {
  const defaultRange = getDefaultDateRange();
  const [dateRange, setDateRange] = useState(defaultRange);
  const [transacciones, setTransacciones] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [selectedTransaccion, setSelectedTransaccion] = useState(null);
  const [openEditarModal, setOpenEditarModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, severity: 'success', message: '' });

  const cargarTransacciones = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/finanzas/ultimas', {
        params: dateRange,
      });
      setTransacciones(response.data);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudieron cargar las transacciones.',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    cargarTransacciones();
  }, [cargarTransacciones, refreshSignal]);

  const filteredTransacciones = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transacciones.filter((transaction) => {
      const matchesType = typeFilter === 'todos' || transaction.tipo === typeFilter;
      const matchesSearch = !normalizedSearch || [
        transaction.tipo,
        transaction.concepto,
        transaction.cliente_nombre,
        transaction.numero_recibo,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      return matchesType && matchesSearch;
    });
  }, [search, transacciones, typeFilter]);

  const totalIngresos = useMemo(() => (
    filteredTransacciones
      .filter((transaction) => transaction.tipo === 'ingreso' || transaction.tipo === 'abono')
      .reduce((sum, transaction) => sum + parseFloat(transaction.monto), 0)
  ), [filteredTransacciones]);

  const totalEgresos = useMemo(() => (
    filteredTransacciones
      .filter((transaction) => transaction.tipo === 'egreso' || transaction.tipo === 'retiro')
      .reduce((sum, transaction) => sum + parseFloat(transaction.monto), 0)
  ), [filteredTransacciones]);

  const balanceGeneral = totalIngresos - totalEgresos;

  const handleDeleteTransaccion = async (id) => {
    if (!window.confirm('¿Desea eliminar esta transacción?')) {
      return;
    }

    try {
      await api.delete(`/api/finanzas/${id}`);
      await cargarTransacciones();
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Transacción eliminada correctamente.',
      });
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      setFeedback({
        open: true,
        severity: 'error',
        message: 'No se pudo eliminar la transacción.',
      });
    }
  };

  return (
    <>
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard
            label="Ingresos visibles"
            value={currencyFormatter.format(totalIngresos)}
            icon={<PaymentsOutlinedIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={4}>
          <MetricCard
            label="Egresos visibles"
            value={currencyFormatter.format(totalEgresos)}
            icon={<ReceiptLongOutlinedIcon />}
            tone="accent"
          />
        </Grid>
        <Grid item xs={12} sm={12} lg={4}>
          <MetricCard
            label="Balance del rango"
            value={currencyFormatter.format(balanceGeneral)}
            icon={<BalanceOutlinedIcon />}
            tone="success"
          />
        </Grid>
      </Grid>

      <SectionCard
        title="Movimientos"
        subtitle="Consulta, filtra y administra las transacciones del rango."
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
              label="Tipo"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      >
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Fecha inicial"
              type="date"
              name="fechaInicio"
              value={dateRange.fechaInicio}
              onChange={(event) => setDateRange((current) => ({ ...current, [event.target.name]: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Fecha final"
              type="date"
              name="fechaFin"
              value={dateRange.fechaFin}
              onChange={(event) => setDateRange((current) => ({ ...current, [event.target.name]: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack justifyContent="center" sx={{ height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {filteredTransacciones.length} de {transacciones.length} movimientos
              </Typography>
            </Stack>
          </Grid>
        </Grid>

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
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Concepto</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Forma de pago</TableCell>
                <TableCell align="right">Monto</TableCell>
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
                        Cargando transacciones...
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : filteredTransacciones.length > 0 ? (
                filteredTransacciones.map((tran) => (
                  <TableRow key={tran.id} hover>
                    <TableCell>{String(tran.fecha).slice(0, 10)}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize', fontWeight: 800 }}>{tran.tipo}</TableCell>
                    <TableCell>{tran.concepto}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {tran.cliente_nombre || 'General'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tran.numero_recibo || 'Sin recibo'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {tran.forma_pago || 'No especificado'}
                    </TableCell>
                    <TableCell align="right">
                      {currencyFormatter.format(parseFloat(tran.monto))}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar transacción">
                        <IconButton onClick={() => {
                          setSelectedTransaccion(tran);
                          setOpenEditarModal(true);
                        }}
                        >
                          <EditIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar transacción">
                        <IconButton onClick={() => handleDeleteTransaccion(tran.id)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1">No hay movimientos para este filtro.</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Ajusta fechas, tipo o búsqueda.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>

      {selectedTransaccion ? (
        <EditarTransaccionModal
          open={openEditarModal}
          onClose={() => {
            setOpenEditarModal(false);
            setSelectedTransaccion(null);
            cargarTransacciones();
          }}
          transaccion={selectedTransaccion}
          onTransaccionUpdated={() => {
            setOpenEditarModal(false);
            setSelectedTransaccion(null);
            cargarTransacciones();
          }}
        />
      ) : null}

      <FeedbackSnackbar
        open={feedback.open}
        severity={feedback.severity}
        message={feedback.message}
        onClose={() => setFeedback((current) => ({ ...current, open: false }))}
      />
    </>
  );
}

export default UltimasTransacciones;
