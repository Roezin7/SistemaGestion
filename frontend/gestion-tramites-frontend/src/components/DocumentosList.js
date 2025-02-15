// src/components/DocumentosList.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, TextField, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

const DocumentosList = ({ clienteId, refreshFlag, onRefresh }) => {
  const [documentos, setDocumentos] = useState([]);
  const [editDocId, setEditDocId] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  useEffect(() => {
    axios.get(`http://localhost:5000/api/clientes/${clienteId}/documentos`)
      .then(response => setDocumentos(response.data))
      .catch(error => console.error('Error al cargar documentos:', error));
  }, [clienteId, refreshFlag]);

  const handleRename = (docId) => {
    axios.put(`http://localhost:5000/api/clientes/documentos/${docId}`, { nuevoNombre })
      .then(response => {
        setEditDocId(null);
        onRefresh();
      })
      .catch(error => console.error('Error al renombrar documento:', error));
  };

  const handleDelete = (docId) => {
    axios.delete(`http://localhost:5000/api/clientes/documentos/${docId}`)
      .then(response => onRefresh())
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
                      href={`http://localhost:5000/api/documentos/${filename}`} 
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
