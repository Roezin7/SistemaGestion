// 4) Modificar src/components/FinanzasPage.js para incluir el nuevo panel
import React from 'react';
import { Box, Typography } from '@mui/material';
import FinanzasForm         from './FinanzasForm';
import UltimasTransacciones from './UltimasTransacciones';
import RepartoSocios        from './RepartoSocios';    // <-- Importa aquí

export default function FinanzasPage() {
  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Finanzas
      </Typography>

      <FinanzasForm />

      <UltimasTransacciones />

      {/* NUEVO: Panel de reparto entre socios */}
      <RepartoSocios />
    </Box>
  );
}
