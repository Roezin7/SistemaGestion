import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import AddCardOutlinedIcon from '@mui/icons-material/AddCardOutlined';
import FinanzasForm from './FinanzasForm';
import PageHeader from './ui/PageHeader';
import RepartoSocios from './RepartoSocios';
import UltimasTransacciones from './UltimasTransacciones';
import EntryPanelDrawer from './ui/EntryPanelDrawer';

function FinanzasPage() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [registroOpen, setRegistroOpen] = useState(false);

  return (
    <Box>
      <PageHeader
        eyebrow="Finanzas"
        title="Finanzas"
        subtitle="Movimientos, histórico y reparto del periodo."
        actions={(
          <Button variant="contained" startIcon={<AddCardOutlinedIcon />} onClick={() => setRegistroOpen(true)}>
            Registrar movimiento
          </Button>
        )}
      />

      <Box sx={{ mt: 2.5 }}>
        <UltimasTransacciones refreshSignal={refreshSignal} />
      </Box>
      <Box sx={{ mt: 2.5 }}>
        <RepartoSocios />
      </Box>

      <EntryPanelDrawer
        open={registroOpen}
        onClose={() => setRegistroOpen(false)}
        title="Registrar movimiento"
        subtitle="Panel exclusivo para altas financieras, separado del histórico y del reparto."
      >
        {registroOpen ? (
          <FinanzasForm
            embedded
            onCancel={() => setRegistroOpen(false)}
            onTransaccionCreated={() => setRefreshSignal((current) => current + 1)}
          />
        ) : null}
      </EntryPanelDrawer>
    </Box>
  );
}

export default FinanzasPage;
