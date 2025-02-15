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
    client_id: '' // Opcional para asociar a un cliente
  });

  const [clients, setClients] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/clientes')
      .then(response => setClients(response.data))
      .catch(error => console.error('Error al cargar clientes:', error));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:5000/api/finanzas', formData)
      .then(response => {
        alert('Transacción guardada');
        setFormData({ tipo: 'ingreso', concepto: '', fecha: '', monto: '', client_id: '' });
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
      <Button type="submit" variant="contained">
        Guardar Transacción
      </Button>
    </Box>
  );
};

export default FinanzasForm;
