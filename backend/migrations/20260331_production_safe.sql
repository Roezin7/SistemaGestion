-- Migracion segura e idempotente para produccion.
-- Objetivo: alinear una base existente con el esquema que ahora espera la app
-- sin borrar informacion ni recrear tablas.

BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'empleado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historial_cambios (
    id SERIAL PRIMARY KEY,
    usuario_id INT,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
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

CREATE TABLE IF NOT EXISTS documentos_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    ruta_archivo VARCHAR(255),
    nombre_archivo VARCHAR(255),
    fecha_subida TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finanzas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    concepto VARCHAR(255),
    fecha DATE,
    monto NUMERIC(10,2),
    client_id INTEGER,
    forma_pago VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS retiros_socios (
    id SERIAL PRIMARY KEY,
    socio VARCHAR(100) NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    fecha DATE NOT NULL
);

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS nombre VARCHAR(100),
    ADD COLUMN IF NOT EXISTS username VARCHAR(50),
    ADD COLUMN IF NOT EXISTS password TEXT,
    ADD COLUMN IF NOT EXISTS rol VARCHAR(50),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE usuarios
SET rol = CASE
    WHEN rol IS NULL OR btrim(rol) = '' THEN 'empleado'
    WHEN lower(btrim(rol)) = 'usuario' THEN 'empleado'
    WHEN lower(btrim(rol)) IN ('admin', 'gerente', 'empleado') THEN lower(btrim(rol))
    ELSE 'empleado'
END
WHERE rol IS DISTINCT FROM CASE
    WHEN rol IS NULL OR btrim(rol) = '' THEN 'empleado'
    WHEN lower(btrim(rol)) = 'usuario' THEN 'empleado'
    WHEN lower(btrim(rol)) IN ('admin', 'gerente', 'empleado') THEN lower(btrim(rol))
    ELSE 'empleado'
END;

ALTER TABLE usuarios
    ALTER COLUMN rol SET DEFAULT 'empleado';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuarios'
          AND column_name = 'rol'
    ) THEN
        ALTER TABLE usuarios ALTER COLUMN rol SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'usuarios_rol_check'
          AND conrelid = 'usuarios'::regclass
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_rol_check
            CHECK (rol IN ('admin', 'gerente', 'empleado')) NOT VALID;
    END IF;
END $$;

ALTER TABLE historial_cambios
    ADD COLUMN IF NOT EXISTS usuario_id INT,
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'historial_cambios_usuario_id_fkey'
          AND conrelid = 'historial_cambios'::regclass
    ) THEN
        ALTER TABLE historial_cambios DROP CONSTRAINT historial_cambios_usuario_id_fkey;
    END IF;

    ALTER TABLE historial_cambios
        ADD CONSTRAINT historial_cambios_usuario_id_fkey
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS costo_total_documentos NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS abono_inicial NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW();

UPDATE clientes
SET costo_total_documentos = 0
WHERE costo_total_documentos IS NULL;

UPDATE clientes
SET abono_inicial = 0
WHERE abono_inicial IS NULL;

ALTER TABLE clientes
    ALTER COLUMN costo_total_documentos SET DEFAULT 0,
    ALTER COLUMN abono_inicial SET DEFAULT 0,
    ALTER COLUMN estado_tramite TYPE VARCHAR(100);

ALTER TABLE documentos_cliente
    ADD COLUMN IF NOT EXISTS cliente_id INTEGER,
    ADD COLUMN IF NOT EXISTS ruta_archivo VARCHAR(255),
    ADD COLUMN IF NOT EXISTS nombre_archivo VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documentos_cliente_cliente_id_fkey'
          AND conrelid = 'documentos_cliente'::regclass
    ) THEN
        ALTER TABLE documentos_cliente DROP CONSTRAINT documentos_cliente_cliente_id_fkey;
    END IF;

    ALTER TABLE documentos_cliente
        ADD CONSTRAINT documentos_cliente_cliente_id_fkey
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

ALTER TABLE finanzas
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS concepto VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fecha DATE,
    ADD COLUMN IF NOT EXISTS monto NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS client_id INTEGER,
    ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(50);

UPDATE finanzas
SET tipo = 'documento'
WHERE lower(btrim(tipo)) = 'documentos';

UPDATE finanzas
SET tipo = lower(btrim(tipo))
WHERE tipo IS NOT NULL
  AND tipo <> lower(btrim(tipo));

ALTER TABLE finanzas
    ALTER COLUMN tipo TYPE VARCHAR(20);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finanzas_client_id_fkey'
          AND conrelid = 'finanzas'::regclass
    ) THEN
        ALTER TABLE finanzas DROP CONSTRAINT finanzas_client_id_fkey;
    END IF;

    ALTER TABLE finanzas
        ADD CONSTRAINT finanzas_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES clientes(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finanzas_tipo_check'
          AND conrelid = 'finanzas'::regclass
    ) THEN
        ALTER TABLE finanzas
            ADD CONSTRAINT finanzas_tipo_check
            CHECK (tipo IN ('ingreso', 'egreso', 'abono', 'retiro', 'documento')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_historial_cambios_fecha
    ON historial_cambios (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_historial_cambios_usuario_id
    ON historial_cambios (usuario_id);

CREATE INDEX IF NOT EXISTS idx_clientes_fecha_creacion
    ON clientes (fecha_creacion);

CREATE INDEX IF NOT EXISTS idx_documentos_cliente_cliente_id
    ON documentos_cliente (cliente_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_fecha
    ON finanzas (fecha);

CREATE INDEX IF NOT EXISTS idx_finanzas_tipo_fecha
    ON finanzas (tipo, fecha);

CREATE INDEX IF NOT EXISTS idx_finanzas_client_id
    ON finanzas (client_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_client_id_tipo
    ON finanzas (client_id, tipo);

CREATE INDEX IF NOT EXISTS idx_retiros_socios_fecha
    ON retiros_socios (fecha);

SELECT setval(
    pg_get_serial_sequence('usuarios', 'id'),
    COALESCE((SELECT MAX(id) FROM usuarios), 0) + 1,
    false
);

SELECT setval(
    pg_get_serial_sequence('historial_cambios', 'id'),
    COALESCE((SELECT MAX(id) FROM historial_cambios), 0) + 1,
    false
);

SELECT setval(
    pg_get_serial_sequence('clientes', 'id'),
    COALESCE((SELECT MAX(id) FROM clientes), 0) + 1,
    false
);

SELECT setval(
    pg_get_serial_sequence('documentos_cliente', 'id'),
    COALESCE((SELECT MAX(id) FROM documentos_cliente), 0) + 1,
    false
);

SELECT setval(
    pg_get_serial_sequence('finanzas', 'id'),
    COALESCE((SELECT MAX(id) FROM finanzas), 0) + 1,
    false
);

SELECT setval(
    pg_get_serial_sequence('retiros_socios', 'id'),
    COALESCE((SELECT MAX(id) FROM retiros_socios), 0) + 1,
    false
);

COMMIT;
