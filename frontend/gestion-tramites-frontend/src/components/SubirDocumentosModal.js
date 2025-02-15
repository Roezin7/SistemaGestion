import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider } from '@mui/material';
import DocumentosUpload from './DocumentosUpload';
import DocumentosList from './DocumentosList';

const SubirDocumentosModal = ({ open, onClose, clienteId }) => {
  const [refreshFlag, setRefreshFlag] = useState(false);

  const refreshDocuments = () => {
    setRefreshFlag(!refreshFlag);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Documentos del Cliente</DialogTitle>
      <DialogContent>
        <DocumentosUpload clienteId={clienteId} onUploadComplete={refreshDocuments} />
        <Divider sx={{ my: 2 }} />
        <DocumentosList clienteId={clienteId} refreshFlag={refreshFlag} onRefresh={refreshDocuments} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubirDocumentosModal;
