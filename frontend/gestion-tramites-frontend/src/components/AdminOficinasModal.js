import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
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
import api from '../services/api';

const AdminOficinasModal = ({ open, onClose, onSessionUpdated }) => {
  const [oficinas, setOficinas] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nuevaOficina, setNuevaOficina] = useState('');
  const [editingOfficeId, setEditingOfficeId] = useState(null);
  const [editingNombre, setEditingNombre] = useState('');

  const fetchOficinas = useCallback(() => {
    setLoading(true);
    setError('');

    api.get('/api/auth/oficinas')
      .then((response) => setOficinas(response.data || []))
      .catch((fetchError) => {
        console.error('Error al cargar oficinas:', fetchError);
        setError(fetchError.response?.data?.message || 'No se pudieron cargar las oficinas.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      fetchOficinas();
    }
  }, [open, fetchOficinas]);

  const handleCreate = () => {
    api.post('/api/auth/oficinas', { nombre: nuevaOficina })
      .then(() => {
        setNuevaOficina('');
        fetchOficinas();
        onSessionUpdated?.();
      })
      .catch((createError) => {
        console.error('Error al crear oficina:', createError);
        setError(createError.response?.data?.message || 'No se pudo crear la oficina.');
      });
  };

  const handleSave = (oficinaId) => {
    api.put(`/api/auth/oficinas/${oficinaId}`, { nombre: editingNombre })
      .then(() => {
        setEditingOfficeId(null);
        setEditingNombre('');
        fetchOficinas();
        onSessionUpdated?.();
      })
      .catch((saveError) => {
        console.error('Error al renombrar oficina:', saveError);
        setError(saveError.response?.data?.message || 'No se pudo renombrar la oficina.');
      });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Oficinas</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Crea nuevas oficinas, renómbralas y mantén ordenado el catálogo para el cambio rápido de contexto.
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Nueva oficina"
                fullWidth
                value={nuevaOficina}
                onChange={(event) => setNuevaOficina(event.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={!nuevaOficina.trim()}
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              >
                Crear oficina
              </Button>
            </Stack>
          </Paper>

          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Oficina</TableCell>
                  <TableCell>Acceso</TableCell>
                  <TableCell>Alta</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && oficinas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No hay oficinas registradas.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}

                {oficinas.map((oficina) => (
                  <TableRow key={oficina.id} hover>
                    <TableCell>
                      {editingOfficeId === oficina.id ? (
                        <TextField
                          value={editingNombre}
                          onChange={(event) => setEditingNombre(event.target.value)}
                          size="small"
                          fullWidth
                        />
                      ) : (
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {oficina.nombre}
                          </Typography>
                          {oficina.es_actual ? (
                            <Typography variant="caption" color="primary.main">
                              Oficina activa
                            </Typography>
                          ) : null}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={oficina.tiene_acceso ? 'text.primary' : 'text.secondary'}>
                        {oficina.tiene_acceso ? 'Disponible para tu usuario' : 'Sin acceso asignado'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {oficina.created_at ? new Date(oficina.created_at).toLocaleDateString() : 'Sin fecha'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {editingOfficeId === oficina.id ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleSave(oficina.id)}
                            disabled={!editingNombre.trim()}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingOfficeId(null);
                              setEditingNombre('');
                            }}
                          >
                            Cancelar
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => {
                            setEditingOfficeId(oficina.id);
                            setEditingNombre(oficina.nombre);
                          }}
                          disabled={!oficina.tiene_acceso}
                        >
                          Renombrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default AdminOficinasModal;
