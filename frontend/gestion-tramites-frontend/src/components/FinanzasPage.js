import React, { useState } from 'react';
import { Box } from '@mui/material';
import FinanzasForm from './FinanzasForm';
import PageHeader from './ui/PageHeader';
import RepartoSocios from './RepartoSocios';
import UltimasTransacciones from './UltimasTransacciones';

function FinanzasPage() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <Box>
      <PageHeader
        eyebrow="Control financiero"
        title="Finanzas"
        subtitle="Captura movimientos, consulta el histórico del periodo y mantén al día el reparto de utilidades entre socios."
      />

      <FinanzasForm onTransaccionCreated={() => setRefreshSignal((current) => current + 1)} />
      <Box sx={{ mt: 2.5 }}>
        <UltimasTransacciones refreshSignal={refreshSignal} />
      </Box>
      <Box sx={{ mt: 2.5 }}>
        <RepartoSocios />
      </Box>
    </Box>
  );
}

export default FinanzasPage;
