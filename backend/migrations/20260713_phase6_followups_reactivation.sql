-- Fase 6: seguimientos persistentes y reactivación controlada.
BEGIN;

CREATE TABLE IF NOT EXISTS followup_jobs (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    origin_message_id BIGINT NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    stage INTEGER NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    outbound_message_id BIGINT REFERENCES conversation_messages(id) ON DELETE SET NULL,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT followup_jobs_stage_check CHECK (stage BETWEEN 1 AND 3) NOT VALID,
    CONSTRAINT followup_jobs_status_check CHECK (status IN ('pending','processing','sent','cancelled','completed','failed')) NOT VALID,
    CONSTRAINT followup_jobs_origin_stage_key UNIQUE(origin_message_id,stage)
);
CREATE INDEX IF NOT EXISTS idx_followup_jobs_due ON followup_jobs(due_at,id) WHERE status='pending';

CREATE TABLE IF NOT EXISTS reactivation_campaigns (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    name VARCHAR(180) NOT NULL,
    promotion_id BIGINT REFERENCES promotions(id) ON DELETE SET NULL,
    message_context TEXT NOT NULL,
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ NOT NULL,
    automatic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reactivation_campaigns_status_check CHECK(status IN ('draft','scheduled','running','completed','cancelled','failed')) NOT VALID
);

CREATE TABLE IF NOT EXISTS reactivation_recipients (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES reactivation_campaigns(id) ON DELETE CASCADE,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES conversation_messages(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    skip_reason VARCHAR(100),
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reactivation_recipients_key UNIQUE(campaign_id,conversation_id),
    CONSTRAINT reactivation_recipients_status_check CHECK(status IN ('pending','processing','queued','sent','skipped','failed','cancelled')) NOT VALID
);
CREATE INDEX IF NOT EXISTS idx_reactivation_recipients_pending ON reactivation_recipients(campaign_id,id) WHERE status='pending';

COMMIT;
