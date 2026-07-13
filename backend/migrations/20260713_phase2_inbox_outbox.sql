-- Fase 2: bandeja y outbox durable para envios manuales.
BEGIN;

ALTER TABLE conversation_messages
    ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(80),
    ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS provider_response JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_messages_client_message_id
    ON conversation_messages (connection_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS outbound_message_jobs (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    connection_id BIGINT NOT NULL REFERENCES whatsapp_connections(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    message_id BIGINT NOT NULL UNIQUE REFERENCES conversation_messages(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT outbound_message_jobs_status_check
        CHECK (status IN ('pending', 'processing', 'sent', 'failed')) NOT VALID
);

CREATE INDEX IF NOT EXISTS idx_outbound_message_jobs_pending
    ON outbound_message_jobs (next_attempt_at, id)
    WHERE status IN ('pending', 'processing');

COMMIT;
