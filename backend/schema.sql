DROP TABLE IF EXISTS historial_cambios, retiros_socios, finanzas, documentos_cliente, usuario_oficinas, usuarios, clientes, oficinas CASCADE;

CREATE TABLE oficinas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    oficina_id INT NOT NULL REFERENCES oficinas(id),
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'empleado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'gerente', 'empleado'))
);

CREATE TABLE usuario_oficinas (
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    oficina_id INT NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, oficina_id)
);

CREATE TABLE historial_cambios (
    id SERIAL PRIMARY KEY,
    oficina_id INT NOT NULL REFERENCES oficinas(id),
    usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    oficina_id INT NOT NULL REFERENCES oficinas(id),
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
    oficina_id INT NOT NULL REFERENCES oficinas(id),
    ruta_archivo VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT NOW()
);

CREATE TABLE finanzas (
    id SERIAL PRIMARY KEY,
    oficina_id INT NOT NULL REFERENCES oficinas(id),
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
    oficina_id INT NOT NULL REFERENCES oficinas(id),
    socio VARCHAR(100) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha DATE NOT NULL
);

CREATE INDEX idx_usuarios_oficina_id ON usuarios (oficina_id);
CREATE INDEX idx_usuario_oficinas_oficina_id ON usuario_oficinas (oficina_id);
CREATE INDEX idx_historial_cambios_oficina_id_fecha ON historial_cambios (oficina_id, fecha DESC);
CREATE INDEX idx_clientes_oficina_id ON clientes (oficina_id);
CREATE INDEX idx_documentos_cliente_oficina_id_cliente_id ON documentos_cliente (oficina_id, cliente_id);
CREATE INDEX idx_finanzas_oficina_id_fecha ON finanzas (oficina_id, fecha);
CREATE INDEX idx_finanzas_oficina_id_client_id ON finanzas (oficina_id, client_id);
CREATE INDEX idx_retiros_socios_oficina_id_fecha ON retiros_socios (oficina_id, fecha);
