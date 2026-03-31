import { render, screen } from '@testing-library/react';
import React from 'react';

jest.mock('./components/LoginPage', () => () => <div>Iniciar Sesión</div>);
jest.mock('./components/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('./components/ClientesPage', () => () => <div>Clientes</div>);
jest.mock('./components/FinanzasPage', () => () => <div>Finanzas</div>);
jest.mock('./components/ReportesPage', () => () => <div>Reportes</div>);
jest.mock('./components/AdminBanner', () => () => <div>Admin Banner</div>);
jest.mock('./components/HistorialModal', () => () => null);
jest.mock('./components/AdminUsuariosModal', () => () => null);

import App from './App';

test('muestra el formulario de inicio de sesión cuando no hay sesión activa', () => {
  render(<App />);
  expect(screen.getByText(/iniciar sesión/i)).toBeTruthy();
});
