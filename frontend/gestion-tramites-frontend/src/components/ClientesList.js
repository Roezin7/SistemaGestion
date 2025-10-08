// ClientesList.js
import React, { useMemo } from 'react';

export default function ClientesList({ items, onDelete /* ...otros props */ }) {
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  }, []);
  const rol = user?.rol || 'empleado';
  const canDelete = rol === 'admin' || rol === 'gerente';

  return (
    <div className="clientes-list">
      {items.map(cli => (
        <div key={cli.id} className="cliente-row">
          <span>{cli.nombre}</span>
          {/* ...otros campos */}

          {canDelete ? (
            <button onClick={() => onDelete(cli.id)}>Eliminar</button>
          ) : (
            <button disabled title="Sin permiso">Eliminar</button>
          )}
        </div>
      ))}
    </div>
  );
}
