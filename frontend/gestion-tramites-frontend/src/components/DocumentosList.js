// src/components/DocumentosList.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { buildApiUrl } from '../config';
import api from '../services/api';

const DocumentosList = ({ clienteId, refreshFlag, onRefresh }) => {
  const [documentos, setDocumentos] = useState([]);
  const [editDocId, setEditDocId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  useEffect(() => {
    api.get(`/api/clientes/${clienteId}/documentos`)
      .then(response => setDocumentos(response.data))
      .catch(error => console.error('Error al cargar documentos:', error));
  }, [clienteId, refreshFlag]);

  const handleRename = (docId) => {
    api.put(`/api/clientes/documentos/${docId}`, { nuevoNombre })
      .then(() => {
        setEditDocId(null);
        setNuevoNombre('');
        onRefresh();
      })
      .catch(error => console.error('Error al renombrar documento:', error));
  };

  const handleDelete = (docId) => {
    api.delete(`/api/clientes/documentos/${docId}`)
      .then(() => onRefresh())
      .catch(error => console.error('Error al eliminar documento:', error));
  };

  return (
    <Box mt={2}>
      <Typography variant="h6">Documentos Subidos</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre Archivo</TableCell>
              <TableCell>Ver</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentos.map(doc => {
              // Extraer solo el nombre del archivo (basename)
              const filename = doc.ruta_archivo.split('/').pop();
              return (
                <TableRow key={doc.id}>
                  <TableCell>
                    {editDocId === doc.id ? (
                      <TextField value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
                    ) : (
                      doc.nombre_archivo
                    )}
                  </TableCell>
                  <TableCell>
                    <a 
                      href={buildApiUrl(`/api/documentos/${filename}`)}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Ver
                    </a>
                  </TableCell>
                  <TableCell>
                    {editDocId === doc.id ? (
                      <Button variant="contained" onClick={() => handleRename(doc.id)}>Guardar</Button>
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
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DocumentosList;
