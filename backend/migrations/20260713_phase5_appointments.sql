-- Fase 5: agenda por oficina y notificaciones durables.
BEGIN;

CREATE TABLE IF NOT EXISTS appointment_settings (
    oficina_id INTEGER PRIMARY KEY REFERENCES oficinas(id) ON DELETE CASCADE,
    primary_advisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    weekday_start TIME NOT NULL DEFAULT '10:00',
    weekday_end TIME NOT NULL DEFAULT '17:00',
    slot_minutes INTEGER NOT NULL DEFAULT 15,
    default_duration_minutes INTEGER NOT NULL DEFAULT 15,
    timezone VARCHAR(80) NOT NULL DEFAULT 'America/Mexico_City',
    allow_same_day BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    prospecto_id INTEGER REFERENCES prospectos(id) ON DELETE SET NULL,
    advisor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    modality VARCHAR(30) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'scheduled',
    extraordinary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    summary_snapshot TEXT,
    collected_data_snapshot JSONB,
    lead_strength_snapshot VARCHAR(20),
    service_code_snapshot VARCHAR(100),
    promotion_snapshot JSONB,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT appointments_modality_check CHECK (modality IN ('phone_call','whatsapp_call')) NOT VALID,
    CONSTRAINT appointments_status_check CHECK (status IN ('scheduled','completed','cancelled','no_show')) NOT VALID,
    CONSTRAINT appointments_duration_check CHECK (duration_minutes BETWEEN 5 AND 240) NOT VALID
);
CREATE INDEX IF NOT EXISTS idx_appointments_office_time ON appointments(oficina_id,scheduled_at) WHERE status='scheduled';
CREATE INDEX IF NOT EXISTS idx_appointments_conversation ON appointments(conversation_id,scheduled_at DESC);

CREATE TABLE IF NOT EXISTS notification_jobs (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id),
    connection_id BIGINT NOT NULL REFERENCES whatsapp_connections(id),
    appointment_id BIGINT REFERENCES appointments(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_jobs_status_check CHECK (status IN ('pending','processing','sent','failed')) NOT VALID
);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_pending ON notification_jobs(next_attempt_at,id) WHERE status IN ('pending','processing');

INSERT INTO appointment_settings(oficina_id,timezone)
SELECT o.id,COALESCE(ac.timezone,'America/Mexico_City') FROM oficinas o
LEFT JOIN agent_configurations ac ON ac.oficina_id=o.id
ON CONFLICT(oficina_id) DO NOTHING;

ALTER TABLE prospectos DROP CONSTRAINT IF EXISTS prospectos_estado_check;
ALTER TABLE prospectos ADD CONSTRAINT prospectos_estado_check CHECK (estado IN
 ('nuevo','contactado','interesado','seguimiento','no_responde','descartado','convertido',
  'agente_activo','en_conversacion','calificando','pendiente_agenda','llamada_agendada',
  'atencion_humana','sin_respuesta','perdido','especial','pausado')) NOT VALID;

COMMIT;
