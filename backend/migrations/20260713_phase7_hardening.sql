BEGIN;

CREATE INDEX IF NOT EXISTS idx_agent_jobs_ready ON agent_jobs(next_attempt_at,id)
  WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_outbound_jobs_ready ON outbound_message_jobs(next_attempt_at,id)
  WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_notification_jobs_ready ON notification_jobs(next_attempt_at,id)
  WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_followup_jobs_ready ON followup_jobs(due_at,id)
  WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_reactivation_recipients_conversation ON reactivation_recipients(conversation_id,status);

CREATE OR REPLACE VIEW operational_failures AS
SELECT oficina_id,'webhook'::text AS subsystem,id::bigint AS job_id,status::text,error_message AS error,updated_at
FROM webhook_events WHERE status='failed'
UNION ALL
SELECT oficina_id,'outbound',id::bigint,status::text,last_error,updated_at
FROM outbound_message_jobs WHERE status='failed'
UNION ALL
SELECT oficina_id,'agent',id::bigint,status::text,last_error,updated_at
FROM agent_jobs WHERE status='failed'
UNION ALL
SELECT oficina_id,'notification',id::bigint,status::text,last_error,updated_at
FROM notification_jobs WHERE status='failed'
UNION ALL
SELECT oficina_id,'followup',id::bigint,status::text,last_error,updated_at
FROM followup_jobs WHERE status='failed'
UNION ALL
SELECT oficina_id,'reactivation',id::bigint,status::text,last_error,updated_at
FROM reactivation_recipients WHERE status='failed';

COMMIT;
