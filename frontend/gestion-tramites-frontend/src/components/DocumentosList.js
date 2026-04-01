import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../services/api';

const DocumentosList = ({ clienteId, refreshFlag, onRefresh }) => {
  const [documentos, setDocumentos] = useState([]);
  const [editDocId, setEditDocId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/clientes/${clienteId}/documentos`)
      .then((response) => {
        setDocumentos(response.data);
        setError('');
      })
      .catch((loadError) => {
        console.error('Error al cargar documentos:', loadError);
        setError(loadError.response?.data?.error || 'No se pudieron cargar los documentos.');
      });
  }, [clienteId, refreshFlag]);

  const handleRename = (docId) => {
    api.put(`/api/clientes/documentos/${docId}`, { nuevoNombre })
      .then(() => {
        setEditDocId(null);
        setNuevoNombre('');
        setError('');
        onRefresh();
      })
      .catch((renameError) => {
        console.error('Error al renombrar documento:', renameError);
        setError(renameError.response?.data?.error || 'No se pudo renombrar el documento.');
      });
  };

  const handleDelete = (docId) => {
    api.delete(`/api/clientes/documentos/${docId}`)
      .then(() => {
        setError('');
        onRefresh();
      })
      .catch((deleteError) => {
        console.error('Error al eliminar documento:', deleteError);
        setError(deleteError.response?.data?.error || 'No se pudo eliminar el documento.');
      });
  };

  const handleOpen = async (docId, nombreArchivo) => {
    const previewWindow = window.open('', '_blank', 'noopener,noreferrer');

    try {
      const response = await api.get(`/api/clientes/documentos/${docId}/archivo`, {
        responseType: 'blob',
      });

      const objectUrl = window.URL.createObjectURL(response.data);
      if (previewWindow) {
        previewWindow.location.href = objectUrl;
        previewWindow.document.title = nombreArchivo;
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }

      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
      setError('');
    } catch (openError) {
      if (previewWindow) {
        previewWindow.close();
      }
      console.error('Error al abrir documento:', openError);
      setError(openError.response?.data?.error || 'No se pudo abrir el documento.');
    }
  };

  return (
    <Box mt={2}>
      <Typography variant="h6">Documentos subidos</Typography>
      {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
      <TableContainer component={Paper} sx={{ mt: 1.5 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre del archivo</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Ver</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No hay documentos cargados para este cliente.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}

            {documentos.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  {editDocId === doc.id ? (
                    <TextField
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      size="small"
                      fullWidth
                    />
                  ) : (
                    doc.nombre_archivo
                  )}
                </TableCell>
                <TableCell>
                  {doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleDateString() : 'Sin fecha'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="text"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => handleOpen(doc.id, doc.nombre_archivo)}
                  >
                    Abrir
                  </Button>
                </TableCell>
                <TableCell>
                  {editDocId === doc.id ? (
                    <Button variant="contained" onClick={() => handleRename(doc.id)}>
                      Guardar
                    </Button>
                  ) : (
                    <IconButton onClick={() => { setEditDocId(doc.id); setNuevoNombre(doc.nombre_archivo); }}>
                      <EditIcon />
                    </IconButton>
                  )}
                  <IconButton onClick={() => handleDelete(doc.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DocumentosList;
