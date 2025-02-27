import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { List, ListItem, ListItemText, Container, Typography } from '@mui/material';

const API_URL = "https://sistemagestion-pk62.onrender.com";

const HistorialCambios = () => {
    const [historial, setHistorial] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        axios.get(`${API_URL}/api/auth/historial`, { headers: { Authorization: token } })
            .then(response => setHistorial(response.data))
            .catch(error => console.error("Error al obtener historial:", error));
    }, []);

    return (
        <Container>
            <Typography variant="h4" align="center" gutterBottom>Historial de Cambios</Typography>
            <List>
                {historial.map((cambio) => (
                    <ListItem key={cambio.id}>
                        <ListItemText primary={cambio.descripcion} secondary={`Por: ${cambio.username} - ${new Date(cambio.fecha).toLocaleString()}`} />
                    </ListItem>
                ))}
            </List>
        </Container>
    );
};

export default HistorialCambios;
