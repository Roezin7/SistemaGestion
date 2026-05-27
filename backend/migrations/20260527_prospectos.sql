BEGIN;

CREATE TABLE IF NOT EXISTS prospectos (
    id SERIAL PRIMARY KEY,
    oficina_id INT NOT NULL REFERENCES oficinas(id),
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    email VARCHAR(120),
    interes VARCHAR(160),
    origen VARCHAR(100),
    estado VARCHAR(40) NOT NULL DEFAULT 'nuevo',
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
    fecha_ultimo_contacto DATE,
    fecha_proximo_seguimiento DATE,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE prospectos
    ADD COLUMN IF NOT EXISTS oficina_id INT,
    ADD COLUMN IF NOT EXISTS nombre VARCHAR(255),
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(120),
    ADD COLUMN IF NOT EXISTS interes VARCHAR(160),
    ADD COLUMN IF NOT EXISTS origen VARCHAR(100),
    ADD COLUMN IF NOT EXISTS estado VARCHAR(40),
    ADD COLUMN IF NOT EXISTS prioridad VARCHAR(20),
    ADD COLUMN IF NOT EXISTS fecha_ultimo_contacto DATE,
    ADD COLUMN IF NOT EXISTS fecha_proximo_seguimiento DATE,
    ADD COLUMN IF NOT EXISTS notas TEXT,
    ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE prospectos
SET estado = 'nuevo'
WHERE estado IS NULL OR btrim(estado) = '';

UPDATE prospectos
SET prioridad = 'media'
WHERE prioridad IS NULL OR btrim(prioridad) = '';

ALTER TABLE prospectos
    ALTER COLUMN estado SET DEFAULT 'nuevo',
    ALTER COLUMN prioridad SET DEFAULT 'media';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prospectos_estado_check'
          AND conrelid = 'prospectos'::regclass
    ) THEN
        ALTER TABLE prospectos
            ADD CONSTRAINT prospectos_estado_check
            CHECK (estado IN ('nuevo', 'contactado', 'interesado', 'seguimiento', 'no_responde', 'descartado', 'convertido')) NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prospectos_prioridad_check'
          AND conrelid = 'prospectos'::regclass
    ) THEN
        ALTER TABLE prospectos
            ADD CONSTRAINT prospectos_prioridad_check
            CHECK (prioridad IN ('alta', 'media', 'baja')) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prospectos_oficina_id_estado
    ON prospectos (oficina_id, estado);

CREATE INDEX IF NOT EXISTS idx_prospectos_oficina_id_prioridad
    ON prospectos (oficina_id, prioridad);

CREATE INDEX IF NOT EXISTS idx_prospectos_oficina_id_seguimiento
    ON prospectos (oficina_id, fecha_proximo_seguimiento);

SELECT setval(
    pg_get_serial_sequence('prospectos', 'id'),
    COALESCE((SELECT MAX(id) FROM prospectos), 0) + 1,
    false
);

COMMIT;
