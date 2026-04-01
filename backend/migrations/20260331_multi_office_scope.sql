-- Migracion segura e idempotente para habilitar multioficina.
-- Cada usuario queda ligado a una oficina y todo el dato operativo
-- se segmenta por oficina para evitar traslapes.

BEGIN;

CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE oficinas
    ADD COLUMN IF NOT EXISTS nombre VARCHAR(120),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'oficinas_nombre_key'
          AND conrelid = 'oficinas'::regclass
    ) THEN
        ALTER TABLE oficinas
            ADD CONSTRAINT oficinas_nombre_key UNIQUE (nombre);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

INSERT INTO oficinas (nombre)
SELECT 'Oficina principal'
WHERE NOT EXISTS (
    SELECT 1
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
);

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS oficina_id INTEGER;

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS oficina_id INTEGER;

ALTER TABLE documentos_cliente
    ADD COLUMN IF NOT EXISTS oficina_id INTEGER;

ALTER TABLE finanzas
    ADD COLUMN IF NOT EXISTS oficina_id INTEGER;

ALTER TABLE retiros_socios
    ADD COLUMN IF NOT EXISTS oficina_id INTEGER;

ALTER TABLE historial_cambios
    ADD COLUMN IF NOT EXISTS oficina_id INTEGER;

WITH oficina_base AS (
    SELECT id
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
    ORDER BY id
    LIMIT 1
)
UPDATE usuarios
SET oficina_id = (SELECT id FROM oficina_base)
WHERE oficina_id IS NULL;

WITH oficina_base AS (
    SELECT id
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
    ORDER BY id
    LIMIT 1
)
UPDATE clientes
SET oficina_id = (SELECT id FROM oficina_base)
WHERE oficina_id IS NULL;

UPDATE documentos_cliente d
SET oficina_id = c.oficina_id
FROM clientes c
WHERE d.cliente_id = c.id
  AND d.oficina_id IS NULL;

WITH oficina_base AS (
    SELECT id
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
    ORDER BY id
    LIMIT 1
)
UPDATE documentos_cliente
SET oficina_id = (SELECT id FROM oficina_base)
WHERE oficina_id IS NULL;

UPDATE finanzas f
SET oficina_id = c.oficina_id
FROM clientes c
WHERE f.client_id = c.id
  AND f.oficina_id IS NULL;

WITH oficina_base AS (
    SELECT id
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
    ORDER BY id
    LIMIT 1
)
UPDATE finanzas
SET oficina_id = (SELECT id FROM oficina_base)
WHERE oficina_id IS NULL;

WITH oficina_base AS (
    SELECT id
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
    ORDER BY id
    LIMIT 1
)
UPDATE retiros_socios
SET oficina_id = (SELECT id FROM oficina_base)
WHERE oficina_id IS NULL;

UPDATE historial_cambios h
SET oficina_id = u.oficina_id
FROM usuarios u
WHERE h.usuario_id = u.id
  AND h.oficina_id IS NULL;

WITH oficina_base AS (
    SELECT id
    FROM oficinas
    WHERE lower(nombre) = lower('Oficina principal')
    ORDER BY id
    LIMIT 1
)
UPDATE historial_cambios
SET oficina_id = (SELECT id FROM oficina_base)
WHERE oficina_id IS NULL;

ALTER TABLE usuarios
    ALTER COLUMN oficina_id SET NOT NULL;

ALTER TABLE clientes
    ALTER COLUMN oficina_id SET NOT NULL;

ALTER TABLE documentos_cliente
    ALTER COLUMN oficina_id SET NOT NULL;

ALTER TABLE finanzas
    ALTER COLUMN oficina_id SET NOT NULL;

ALTER TABLE retiros_socios
    ALTER COLUMN oficina_id SET NOT NULL;

ALTER TABLE historial_cambios
    ALTER COLUMN oficina_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'usuarios_oficina_id_fkey'
          AND conrelid = 'usuarios'::regclass
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_oficina_id_fkey
            FOREIGN KEY (oficina_id)
            REFERENCES oficinas(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'clientes_oficina_id_fkey'
          AND conrelid = 'clientes'::regclass
    ) THEN
        ALTER TABLE clientes
            ADD CONSTRAINT clientes_oficina_id_fkey
            FOREIGN KEY (oficina_id)
            REFERENCES oficinas(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documentos_cliente_oficina_id_fkey'
          AND conrelid = 'documentos_cliente'::regclass
    ) THEN
        ALTER TABLE documentos_cliente
            ADD CONSTRAINT documentos_cliente_oficina_id_fkey
            FOREIGN KEY (oficina_id)
            REFERENCES oficinas(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'finanzas_oficina_id_fkey'
          AND conrelid = 'finanzas'::regclass
    ) THEN
        ALTER TABLE finanzas
            ADD CONSTRAINT finanzas_oficina_id_fkey
            FOREIGN KEY (oficina_id)
            REFERENCES oficinas(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'retiros_socios_oficina_id_fkey'
          AND conrelid = 'retiros_socios'::regclass
    ) THEN
        ALTER TABLE retiros_socios
            ADD CONSTRAINT retiros_socios_oficina_id_fkey
            FOREIGN KEY (oficina_id)
            REFERENCES oficinas(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'historial_cambios_oficina_id_fkey'
          AND conrelid = 'historial_cambios'::regclass
    ) THEN
        ALTER TABLE historial_cambios
            ADD CONSTRAINT historial_cambios_oficina_id_fkey
            FOREIGN KEY (oficina_id)
            REFERENCES oficinas(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_oficina_id
    ON usuarios (oficina_id);

CREATE INDEX IF NOT EXISTS idx_clientes_oficina_id
    ON clientes (oficina_id);

CREATE INDEX IF NOT EXISTS idx_documentos_cliente_oficina_id_cliente_id
    ON documentos_cliente (oficina_id, cliente_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_oficina_id_fecha
    ON finanzas (oficina_id, fecha);

CREATE INDEX IF NOT EXISTS idx_finanzas_oficina_id_client_id
    ON finanzas (oficina_id, client_id);

CREATE INDEX IF NOT EXISTS idx_retiros_socios_oficina_id_fecha
    ON retiros_socios (oficina_id, fecha);

CREATE INDEX IF NOT EXISTS idx_historial_cambios_oficina_id_fecha
    ON historial_cambios (oficina_id, fecha DESC);

SELECT setval(
    pg_get_serial_sequence('oficinas', 'id'),
    COALESCE((SELECT MAX(id) FROM oficinas), 0) + 1,
    false
);

COMMIT;
