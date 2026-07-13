const service = require('../services/outboundMessageService');
const logger = require('../utils/structuredLogger');

const INTERVAL_MS = Math.max(250, Number(process.env.OUTBOUND_WORKER_INTERVAL_MS) || 1000);
let timer = null;
let running = false;
let lastError = null;

async function tick() {
  if (running) return;
  running = true;
  try {
    for (let count = 0; count < 20; count += 1) {
      if (!await service.processNextJob()) break;
    }
    for (let count = 0; count < 10; count += 1) {
      if (!await service.processNextNotification()) break;
    }
    lastError = null;
  } catch (error) {
    lastError = error.message;
    logger.error('outbound_worker_failed', { error: error.message });
  } finally {
    running = false;
  }
}

function start() {
  if (timer || process.env.OUTBOUND_WORKER_ENABLED === 'false') return;
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref();
  void tick();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function getStatus() {
  return { enabled: process.env.OUTBOUND_WORKER_ENABLED !== 'false', running, last_error: lastError };
}

module.exports = { start, stop, tick, getStatus };
