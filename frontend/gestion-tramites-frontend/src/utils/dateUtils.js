// src/utils/dateUtils.js
export function getDefaultDateRange() {
    const now = new Date();
    // Primer día del mes
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    // Último día del mes
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
    return {
      fechaInicio: firstDay.toISOString().slice(0, 10),
      fechaFin: lastDay.toISOString().slice(0, 10),
    };
  }
  