DROP TABLE IF EXISTS historial_cambios, retiros_socios, finanzas, documentos_cliente, usuarios, clientes CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'empleado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'gerente', 'empleado'))
);

CREATE TABLE historial_cambios (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    integrantes INTEGER,
    numero_recibo VARCHAR(100),
    estado_tramite VARCHAR(100),
    fecha_cita_cas DATE,
    fecha_cita_consular DATE,
    fecha_inicio_tramite DATE,
    costo_total_tramite NUMERIC(10,2),
    costo_total_documentos NUMERIC(10,2) DEFAULT 0,
    abono_inicial NUMERIC(10,2) DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documentos_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    ruta_archivo VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT NOW()
);

CREATE TABLE finanzas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    concepto VARCHAR(255),
    fecha DATE NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    client_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    forma_pago VARCHAR(50),
    CONSTRAINT finanzas_tipo_check CHECK (tipo IN ('ingreso', 'egreso', 'abono', 'retiro', 'documento'))
);

CREATE TABLE retiros_socios (
    id SERIAL PRIMARY KEY,
    socio VARCHAR(100) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha DATE NOT NULL
);
