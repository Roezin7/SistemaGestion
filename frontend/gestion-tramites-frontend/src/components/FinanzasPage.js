// src/components/FinanzasPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EditarTransaccionModal from './EditarTransaccionModal';

const FinanzasPage = () => {
  const [transacciones, setTransacciones] = useState([]);
  const [selectedTransaccion, setSelectedTransaccion] = useState(null);
  const [openEditarModal, setOpenEditarModal] = useState(false);

  useEffect(() => {
    fetchTransacciones();
  }, []);

  const fetchTransacciones = async () => {
    try {
      const response = await axios.get('/api/finanzas');
      setTransacciones(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (transaccion) => {
    setSelectedTransaccion(transaccion);
    setOpenEditarModal(true);
  };

  const handleDelete = async (id) => {
    // Aquí se puede implementar la eliminación si es necesario
  };

  const handleCloseModal = () => {
    setOpenEditarModal(false);
    setSelectedTransaccion(null);
    fetchTransacciones();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Finanzas
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Cliente ID</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transacciones.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.id}</TableCell>
                <TableCell>{t.tipo}</TableCell>
                <TableCell>{t.concepto}</TableCell>
                <TableCell>{t.fecha}</TableCell>
                <TableCell>{t.monto}</TableCell>
                <TableCell>{t.client_id}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(t)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(t.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {openEditarModal && (
        <EditarTransaccionModal
          open={openEditarModal}
          transaccion={selectedTransaccion}
          onClose={handleCloseModal}
        />
      )}
    </Box>
  );
};

export default FinanzasPage;
