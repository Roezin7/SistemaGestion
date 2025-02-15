DROP TABLE IF EXISTS finanzas, documentos_cliente, clientes CASCADE;

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  integrantes INTEGER,
  numero_recibo VARCHAR(100),
  estado_tramite VARCHAR(50),
  fecha_cita_cas DATE,
  fecha_cita_consular DATE,
  fecha_inicio_tramite DATE,
  costo_total_tramite NUMERIC(10,2),
  fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Tabla para documentos asociados a clientes
CREATE TABLE IF NOT EXISTS documentos_cliente (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  ruta_archivo VARCHAR(255),
  nombre_archivo VARCHAR(255),
  fecha_subida TIMESTAMP DEFAULT NOW()
);

-- Tabla de finanzas (registro de transacciones)
CREATE TABLE IF NOT EXISTS finanzas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL, -- 'ingreso', 'egreso', 'abono', 'retiro'
  concepto VARCHAR(255),
  fecha DATE,
  monto NUMERIC(10,2),
  client_id INTEGER,
  CONSTRAINT fk_client
    FOREIGN KEY (client_id)
    REFERENCES clientes(id)
    ON DELETE SET NULL
);
