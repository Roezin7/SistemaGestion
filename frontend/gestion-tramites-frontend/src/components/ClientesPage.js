import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TableSortLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClienteForm from './ClienteForm';
import EditarClienteModal from './EditarClienteModal';
import SubirDocumentosModal from './SubirDocumentosModal';
import VerInformacionClienteModal from './VerInformacionClienteModal';
import api from '../services/api';

const ClientesPage = () => {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('nombre');
  const [order, setOrder] = useState('asc');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false);
  const [verInfoModalOpen, setVerInfoModalOpen] = useState(false);

  const cargarClientes = useCallback(() => {
    api.get('/api/clientes')
      .then(response => setClientes(response.data))
      .catch(error => console.error('Error al cargar clientes:', error));
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedClientes = [...clientes].sort((a, b) => {
    if (orderBy === 'nombre') {
      if (order === 'asc') return a.nombre.localeCompare(b.nombre);
      else return b.nombre.localeCompare(a.nombre);
    }
    if (orderBy === 'numero_recibo') {
      if (order === 'asc') return (a.numero_recibo || '').localeCompare(b.numero_recibo || '');
      else return (b.numero_recibo || '').localeCompare(a.numero_recibo || '');
    }
    if (orderBy === 'integrantes') {
      if (order === 'asc') return Number(a.integrantes || 0) - Number(b.integrantes || 0);
      else return Number(b.integrantes || 0) - Number(a.integrantes || 0);
    }
    return 0;
  });

  const handleClienteActualizado = (clienteActualizado) => {
    const updatedClientes = clientes.map(cliente =>
      cliente.id === clienteActualizado.id ? clienteActualizado : cliente
    );
    setClientes(updatedClientes);
  };

  const handleDeleteCliente = (clienteId) => {
    if (window.confirm('¿Seguro que desea eliminar este cliente?')) {
      api.delete(`/api/clientes/${clienteId}`)
        .then(() => {
          setClientes(clientes.filter(c => c.id !== clienteId));
        })
        .catch(error => console.error('Error al eliminar cliente:', error));
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Clientes
      </Typography>

      <Box mb={2}>
        <TextField
          label="Buscar Cliente"
          variant="outlined"
          value={search}
          onChange={handleSearchChange}
          fullWidth
        />
      </Box>

      <ClienteForm
        onClienteAgregado={(nuevoCliente) => setClientes([...clientes, nuevoCliente])}
      />

      <Box mt={2}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#06588a' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      '& .MuiTableSortLabel-icon': {
                        color: 'white !important'
                      }
                    }}
                    active={orderBy === 'numero_recibo'}
                    direction={orderBy === 'numero_recibo' ? order : 'asc'}
                    onClick={() => handleRequestSort('numero_recibo')}
                  >
                    No. de Recibo
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    sx={{
                      color: 'white !important',
                      fontWeight: 'bold',
                      '& .MuiTableSortLabel-icon': {
                        color: 'white !important'
                      }
                    }}
                    active={orderBy === 'nombre'}
                    direction={orderBy === 'nombre' ? order : 'asc'}
                    onClick={() => handleRequestSort('nombre')}
                  >
                    Nombre
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  <TableSortLabel
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      '& .MuiTableSortLabel-icon': {
                        color: 'white !important'
                      }
                    }}
                    active={orderBy === 'integrantes'}
                    direction={orderBy === 'integrantes' ? order : 'asc'}
                    onClick={() => handleRequestSort('integrantes')}
                  >
                    Integrantes
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  Estado del Trámite
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedClientes
                .filter(cliente =>
                  cliente.nombre.toLowerCase().includes(search.toLowerCase()) ||
                  (cliente.numero_recibo && cliente.numero_recibo.toLowerCase().includes(search.toLowerCase()))
                )
                .map(cliente => (
                  <TableRow key={cliente.id}>
                    <TableCell>{cliente.numero_recibo}</TableCell>
                    <TableCell>
                      <strong>{cliente.nombre}</strong>
                    </TableCell>
                    <TableCell>{cliente.integrantes}</TableCell>
                    <TableCell>{cliente.estado_tramite}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => {
                        setSelectedCliente(cliente);
                        setEditarModalOpen(true);
                      }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => {
                        setSelectedCliente(cliente);
                        setDocumentosModalOpen(true);
                      }}>
                        <UploadFileIcon />
                      </IconButton>
                      <IconButton onClick={() => {
                        setSelectedCliente(cliente);
                        setVerInfoModalOpen(true);
                      }}>
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteCliente(cliente.id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {sortedClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No hay clientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {selectedCliente && (
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
      )}
    </Box>
  );
};

export default ClientesPage;
