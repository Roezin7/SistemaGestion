-- Fase 4: trabajos de agente, evaluaciones y resúmenes.
BEGIN;

CREATE TABLE IF NOT EXISTS agent_jobs (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    trigger_message_id BIGINT NOT NULL REFERENCES conversation_messages(id) ON DELETE CASCADE,
    automation_version INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    model VARCHAR(100),
    usage_data JSONB,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_jobs_trigger_key UNIQUE (trigger_message_id),
    CONSTRAINT agent_jobs_status_check CHECK (status IN ('pending','processing','completed','cancelled','failed')) NOT VALID
);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_pending ON agent_jobs(next_attempt_at,id) WHERE status IN ('pending','processing');

CREATE TABLE IF NOT EXISTS conversation_summaries (
    conversation_id BIGINT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    summary TEXT NOT NULL,
    collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_message_id BIGINT REFERENCES conversation_messages(id) ON DELETE SET NULL,
    model VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_evaluations (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES conversation_messages(id) ON DELETE SET NULL,
    strength VARCHAR(20) NOT NULL,
    intent VARCHAR(100),
    service_code VARCHAR(100),
    rationale TEXT,
    model VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lead_evaluations_strength_check CHECK (strength IN ('fuerte','medio','debil','especial')) NOT VALID
);
CREATE INDEX IF NOT EXISTS idx_lead_evaluations_conversation ON lead_evaluations(conversation_id,created_at DESC);

COMMIT;
