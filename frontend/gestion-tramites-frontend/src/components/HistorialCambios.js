import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Container, Typography } from '@mui/material';
import api from '../services/api';

const HistorialCambios = () => {
    const [historial, setHistorial] = useState([]);

    useEffect(() => {
        api.get('/api/auth/historial')
            .then(response => setHistorial(response.data))
            .catch(error => console.error("Error al obtener historial:", error));
    }, []);

    return (
        <Container>
            <Typography variant="h4" align="center" gutterBottom>Historial de Cambios</Typography>
            <List>
                {historial.map((cambio) => (
                    <ListItem key={cambio.id}>
                        <ListItemText primary={cambio.descripcion} secondary={`Por: ${cambio.username || 'Sistema'} - ${new Date(cambio.fecha).toLocaleString()}`} />
                    </ListItem>
                ))}
            </List>
        </Container>
    );
};

export default HistorialCambios;
