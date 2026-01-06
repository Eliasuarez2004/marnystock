// src/utils/dateUtils.js

/**
 * Parsea un string de fecha 'YYYY-MM-DD' como una fecha local,
 * evitando el problema de la conversión a UTC.
 * @param {string} dateStr El string de fecha, ej: "2025-12-25"
 * @returns {Date} Un objeto Date en la zona horaria local.
 */
export const parseDateStringAsLocal = (dateStr) => {
  if (!dateStr) return null;
  // Dividimos el string para evitar la interpretación UTC de JS
  const [year, month, day] = dateStr.split('-').map(Number);
  // Creamos la fecha. El mes es 0-indexado en el constructor de Date.
  return new Date(year, month - 1, day);
};