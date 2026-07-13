-- Fase 1: nucleo seguro para conversaciones de WhatsApp.
-- Migracion aditiva e idempotente. No activa conexiones ni automatizaciones.

BEGIN;

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(50),
    ADD COLUMN IF NOT EXISTS telefono_normalizado VARCHAR(32),
    ADD COLUMN IF NOT EXISTS activo BOOLEAN,
    ADD COLUMN IF NOT EXISTS prospecto_id INTEGER;

UPDATE clientes
SET activo = TRUE
WHERE activo IS NULL;

ALTER TABLE clientes
    ALTER COLUMN activo SET DEFAULT TRUE,
    ALTER COLUMN activo SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'clientes_prospecto_id_fkey'
          AND conrelid = 'clientes'::regclass
    ) THEN
        ALTER TABLE clientes
            ADD CONSTRAINT clientes_prospecto_id_fkey
            FOREIGN KEY (prospecto_id)
            REFERENCES prospectos(id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;

ALTER TABLE prospectos
    ADD COLUMN IF NOT EXISTS telefono_normalizado VARCHAR(32),
    ADD COLUMN IF NOT EXISTS fuente_tipo VARCHAR(32),
    ADD COLUMN IF NOT EXISTS codigo_anuncio VARCHAR(100),
    ADD COLUMN IF NOT EXISTS origen_confirmado_at TIMESTAMPTZ;

-- Normaliza prospectos existentes para evitar duplicarlos al recibir su primer webhook.
WITH telefonos AS (
    SELECT id, regexp_replace(telefono, '[^0-9]', '', 'g') AS digits
    FROM prospectos
    WHERE telefono_normalizado IS NULL AND telefono IS NOT NULL
)
UPDATE prospectos p
SET telefono_normalizado = CASE
    WHEN length(t.digits) = 10 THEN '52' || t.digits
    WHEN length(t.digits) = 13 AND t.digits LIKE '521%' THEN '52' || substring(t.digits FROM 4)
    WHEN length(t.digits) BETWEEN 10 AND 15 THEN t.digits
    ELSE NULL
END
FROM telefonos t
WHERE p.id = t.id;

CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    provider VARCHAR(32) NOT NULL DEFAULT 'wasender',
    public_id VARCHAR(64) NOT NULL,
    phone_number VARCHAR(50),
    phone_normalized VARCHAR(32),
    external_session_ref VARCHAR(255),
    api_key_ciphertext TEXT,
    api_key_iv VARCHAR(64),
    api_key_tag VARCHAR(64),
    webhook_secret_ciphertext TEXT,
    webhook_secret_iv VARCHAR(64),
    webhook_secret_tag VARCHAR(64),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    connection_status VARCHAR(32) NOT NULL DEFAULT 'unconfigured',
    last_event_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT whatsapp_connections_provider_check
        CHECK (provider IN ('wasender')) NOT VALID,
    CONSTRAINT whatsapp_connections_office_provider_key
        UNIQUE (oficina_id, provider),
    CONSTRAINT whatsapp_connections_public_id_key
        UNIQUE (public_id)
);

CREATE TABLE IF NOT EXISTS agent_configurations (
    oficina_id INTEGER PRIMARY KEY REFERENCES oficinas(id),
    agent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    notification_recipient VARCHAR(255),
    additional_context TEXT,
    timezone VARCHAR(80) NOT NULL DEFAULT 'America/Mexico_City',
    human_intervention_cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    followup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    first_followup_minutes INTEGER NOT NULL DEFAULT 120,
    second_followup_minutes INTEGER NOT NULL DEFAULT 1440,
    appointments_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_configurations_cooldown_check
        CHECK (human_intervention_cooldown_minutes >= 0) NOT VALID,
    CONSTRAINT agent_configurations_followups_check
        CHECK (
            first_followup_minutes > 0
            AND second_followup_minutes > first_followup_minutes
        ) NOT VALID
);

CREATE TABLE IF NOT EXISTS ad_sources (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(160) NOT NULL,
    campaign_name VARCHAR(160),
    service_code VARCHAR(100),
    source_type VARCHAR(32) NOT NULL DEFAULT 'meta_ad',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ad_sources_source_type_check
        CHECK (source_type IN ('meta_ad')) NOT VALID
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_sources_office_code_ci
    ON ad_sources (oficina_id, UPPER(code));

CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    connection_id BIGINT NOT NULL REFERENCES whatsapp_connections(id),
    prospecto_id INTEGER REFERENCES prospectos(id) ON DELETE SET NULL,
    ad_source_id BIGINT REFERENCES ad_sources(id) ON DELETE SET NULL,
    remote_jid VARCHAR(255),
    phone_number VARCHAR(50),
    phone_normalized VARCHAR(32),
    display_name VARCHAR(255),
    source_type VARCHAR(32) NOT NULL DEFAULT 'unknown',
    ad_code_snapshot VARCHAR(100),
    origin_confirmed_at TIMESTAMPTZ,
    status VARCHAR(40) NOT NULL DEFAULT 'nuevo',
    attention_mode VARCHAR(20) NOT NULL DEFAULT 'humano',
    automation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    automation_block_reason VARCHAR(80),
    automation_version INTEGER NOT NULL DEFAULT 1,
    assigned_user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    taken_at TIMESTAMPTZ,
    human_intervened_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    do_not_contact_at TIMESTAMPTZ,
    do_not_contact_reason TEXT,
    first_inbound_at TIMESTAMPTZ,
    last_inbound_at TIMESTAMPTZ,
    last_outbound_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversations_source_type_check
        CHECK (source_type IN ('unknown', 'organic', 'meta_ad')) NOT VALID,
    CONSTRAINT conversations_attention_mode_check
        CHECK (attention_mode IN ('automatico', 'humano', 'pausado')) NOT VALID,
    CONSTRAINT conversations_unread_count_check
        CHECK (unread_count >= 0) NOT VALID
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_connection_remote_jid
    ON conversations (connection_id, remote_jid)
    WHERE remote_jid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_connection_phone
    ON conversations (connection_id, phone_normalized)
    WHERE phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_office_activity
    ON conversations (oficina_id, last_message_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_office_mode
    ON conversations (oficina_id, attention_mode, status);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    connection_id BIGINT NOT NULL REFERENCES whatsapp_connections(id),
    provider VARCHAR(32) NOT NULL DEFAULT 'wasender',
    external_message_id VARCHAR(255),
    remote_jid VARCHAR(255),
    direction VARCHAR(16) NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'webhook',
    message_type VARCHAR(30) NOT NULL DEFAULT 'text',
    body TEXT,
    media_metadata JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider_timestamp TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversation_messages_direction_check
        CHECK (direction IN ('inbound', 'outbound')) NOT VALID,
    CONSTRAINT conversation_messages_sender_type_check
        CHECK (sender_type IN ('prospect', 'agent', 'employee', 'system')) NOT VALID,
    CONSTRAINT conversation_messages_source_check
        CHECK (source IN ('webhook', 'phone', 'app', 'ai', 'system')) NOT VALID,
    CONSTRAINT conversation_messages_status_check
        CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) NOT VALID
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_external_id
    ON conversation_messages (connection_id, external_message_id)
    WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_time
    ON conversation_messages (conversation_id, provider_timestamp, id);

CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    connection_id BIGINT NOT NULL REFERENCES whatsapp_connections(id),
    provider VARCHAR(32) NOT NULL DEFAULT 'wasender',
    event_type VARCHAR(80) NOT NULL,
    dedupe_key VARCHAR(128) NOT NULL,
    external_message_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    payload JSONB NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT webhook_events_status_check
        CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed')) NOT VALID,
    CONSTRAINT webhook_events_dedupe_key
        UNIQUE (connection_id, event_type, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_pending
    ON webhook_events (status, received_at, id)
    WHERE status IN ('received', 'processing');

CREATE INDEX IF NOT EXISTS idx_clientes_phone_active
    ON clientes (telefono_normalizado, activo)
    WHERE telefono_normalizado IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospectos_office_phone
    ON prospectos (oficina_id, telefono_normalizado)
    WHERE telefono_normalizado IS NOT NULL;

INSERT INTO agent_configurations (oficina_id)
SELECT id FROM oficinas
ON CONFLICT (oficina_id) DO NOTHING;

COMMIT;
