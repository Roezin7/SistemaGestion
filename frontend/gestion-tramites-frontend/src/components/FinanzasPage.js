// src/components/FinanzasPage.js
import React from 'react';
import { Box, Typography } from '@mui/material';
import FinanzasForm from './FinanzasForm';
import UltimasTransacciones from './UltimasTransacciones';
import BalanceGeneral from './BalanceGeneral';

const FinanzasPage = () => {
  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Finanzas
      </Typography>
      {/* Balance general con fechas por defecto y formateo en dólares */}
      <BalanceGeneral />

      {/* Formulario para registrar transacciones */}
      <FinanzasForm />

      {/* Listado de últimas transacciones (con opción de eliminar) */}
      <UltimasTransacciones />
    </Box>
  );
};

export default FinanzasPage;