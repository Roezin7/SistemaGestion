const webhookService = require('../services/wasenderWebhookService');
const logger = require('../utils/structuredLogger');

const POLL_INTERVAL_MS = Math.max(250, Number(process.env.WEBHOOK_WORKER_INTERVAL_MS) || 1000);
const MAX_PER_TICK = Math.max(1, Number(process.env.WEBHOOK_WORKER_BATCH_SIZE) || 20);

let timer = null;
let running = false;
let lastRunAt = null;
let lastError = null;

async function tick() {
  if (running) return;
  running = true;
  lastRunAt = new Date().toISOString();
  try {
    for (let count = 0; count < MAX_PER_TICK; count += 1) {
      const processed = await webhookService.processNextEvent();
      if (!processed) break;
    }
    lastError = null;
  } catch (error) {
    lastError = error.message;
    logger.error('webhook_worker_tick_failed', { error: error.message });
  } finally {
    running = false;
  }
}

function start() {
  if (timer || process.env.WEBHOOK_WORKER_ENABLED === 'false') return;
  timer = setInterval(tick, POLL_INTERVAL_MS);
  timer.unref();
  void tick();
  logger.info('webhook_worker_started', { poll_interval_ms: POLL_INTERVAL_MS });
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function getStatus() {
  return {
    enabled: process.env.WEBHOOK_WORKER_ENABLED !== 'false',
    running,
    last_run_at: lastRunAt,
    last_error: lastError,
  };
}

module.exports = { start, stop, tick, getStatus };
