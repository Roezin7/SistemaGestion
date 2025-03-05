// src/components/FinanzasPage.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import FinanzasForm from './FinanzasForm';
import UltimasTransacciones from './UltimasTransacciones';

const FinanzasPage = () => {
  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Finanzas
      </Typography>

      {/* Formulario para registrar transacciones */}
      <FinanzasForm />

      {/* Listado de últimas transacciones con Balance General al final */}
      <UltimasTransacciones />
    </Box>
  );
};

export default FinanzasPage;
