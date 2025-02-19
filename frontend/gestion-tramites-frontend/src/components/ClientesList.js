// src/components/ClientesList.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ClientesList = () => {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    axios.get('https://sistemagestion-pk62.onrender.com/api/clientes')
      .then(response => setClientes(response.data))
      .catch(error => console.error('Error al cargar clientes:', error));
  }, []);

  return (
    <div>
      <h2>Lista de Clientes</h2>
      <ul>
        {clientes.map(cliente => (
          <li key={cliente.id}>
            {cliente.nombre} - Recibo: {cliente.numero_recibo} - Estado: {cliente.estado_tramite}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientesList;
