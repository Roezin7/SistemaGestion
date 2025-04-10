// src/components/FinanzasForm.js
import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import axios from 'axios';

const FinanzasForm = () => {
  const [formData, setFormData] = useState({
    tipo: 'ingreso', // Opciones: ingreso, egreso, abono, retiro
    concepto: '',
    fecha: '',
    monto: '',
    client_id: '', // Opcional para asociar a un cliente
    forma_pago: 'efectivo'  // Nuevo campo: por defecto "efectivo"
  });

  const [clients, setClients] = useState([]);

  useEffect(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/clientes')
      .then(response => setClients(response.data))
      .catch(error => console.error('Error al cargar clientes:', error));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('https://sistemagestion-pk62.onrender.com/api/finanzas', formData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(response => {
        alert('Transacción guardada');
        setFormData({ tipo: 'ingreso', concepto: '', fecha: '', monto: '', client_id: '', forma_pago: 'efectivo' });
      })
      .catch(error => console.error('Error al guardar transacción:', error));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
      <TextField
        select
        label="Tipo"
        name="tipo"
        value={formData.tipo}
        onChange={handleChange}
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="ingreso">Ingreso</MenuItem>
        <MenuItem value="egreso">Egreso</MenuItem>
        <MenuItem value="abono">Abono</MenuItem>
        <MenuItem value="retiro">Retiro</MenuItem>
        <MenuItem value="documentos">Documentos</MenuItem>
      </TextField>
      <TextField 
        label="Concepto" 
        name="concepto" 
        value={formData.concepto} 
        onChange={handleChange} 
        required 
        sx={{ flexGrow: 1 }} 
      />
      <TextField
        label="Fecha"
        name="fecha"
        type="date"
        value={formData.fecha}
        onChange={handleChange}
        InputLabelProps={{ shrink: true }}
        required
        sx={{ minWidth: 150 }}
      />
      <TextField 
        label="Monto" 
        name="monto" 
        type="number" 
        step="0.01" 
        value={formData.monto} 
        onChange={handleChange} 
        required 
        InputProps={{ inputProps: { style: { MozAppearance: 'textfield', WebkitAppearance: 'none' } } }}
        sx={{ minWidth: 150 }}
      />
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel id="client-select-label">Cliente (opcional)</InputLabel>
        <Select
          labelId="client-select-label"
          label="Cliente (opcional)"
          name="client_id"
          value={formData.client_id}
          onChange={handleChange}
        >
          <MenuItem value="">
            <em>Ninguno</em>
          </MenuItem>
          {clients.map(client => (
            <MenuItem key={client.id} value={client.id}>
              {client.nombre} - {client.numero_recibo}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Nuevo campo: Forma de Pago */}
      <FormControl sx={{ minWidth: 150 }}>
        <InputLabel id="forma-pago-label">Forma de Pago</InputLabel>
        <Select
          labelId="forma-pago-label"
          label="Forma de Pago"
          name="forma_pago"
          value={formData.forma_pago}
          onChange={handleChange}
        >
          <MenuItem value="efectivo">Efectivo</MenuItem>
          <MenuItem value="transferencia">Transferencia</MenuItem>
        </Select>
      </FormControl>
      <Button type="submit" variant="contained">
        Guardar Transacción
      </Button>
    </Box>
  );
};

export default FinanzasForm;
