const test = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../integrations/wasender/WasenderAdapter');

test('normaliza messages.received con el formato oficial de WasenderAPI', () => {
  const result = adapter.normalizeWebhook({
    event: 'messages.received',
    timestamp: 1747775431,
    data: {
      messages: {
        key: {
          id: 'msg-in-1',
          fromMe: false,
          remoteJid: '5512345678@s.whatsapp.net',
          cleanedSenderPn: '5512345678',
        },
        pushName: 'Persona Demo',
        messageBody: 'Hola CB-VISA-TURISTA',
        message: { conversation: 'Hola CB-VISA-TURISTA' },
      },
    },
  });

  assert.equal(result.eventType, 'messages.received');
  assert.equal(result.events.length, 1);
  assert.deepEqual(
    {
      id: result.events[0].externalMessageId,
      direction: result.events[0].direction,
      sender: result.events[0].senderType,
      source: result.events[0].source,
      phone: result.events[0].phoneNormalized,
      body: result.events[0].body,
    },
    {
      id: 'msg-in-1',
      direction: 'inbound',
      sender: 'prospect',
      source: 'webhook',
      phone: '525512345678',
      body: 'Hola CB-VISA-TURISTA',
    }
  );
});

test('normaliza messages.upsert saliente como respuesta desde telefono', () => {
  const result = adapter.normalizeWebhook({
    event: 'messages.upsert',
    timestamp: 1747775431,
    data: {
      messages: [{
        key: {
          id: 'msg-out-1',
          fromMe: true,
          remoteJid: '525512345678@s.whatsapp.net',
          cleanedRecipientPn: '525512345678',
        },
        message: { conversation: 'Te atiendo personalmente.' },
      }],
    },
  });

  assert.equal(result.events[0].direction, 'outbound');
  assert.equal(result.events[0].senderType, 'employee');
  assert.equal(result.events[0].source, 'phone');
  assert.equal(result.events[0].status, 'sent');
});

test('normaliza estados oficiales y genera deduplicacion estable para lotes', () => {
  const status = adapter.normalizeWebhook({
    event: 'messages.update',
    timestamp: 1747775431467,
    data: { update: { status: 4 }, key: { id: 'msg-1' } },
  });
  assert.equal(status.events[0].status, 'read');

  const payloadA = {
    event: 'messages.upsert',
    data: { messages: [{ key: { id: 'b' } }, { key: { id: 'a' } }] },
  };
  const payloadB = {
    event: 'messages.upsert',
    data: { messages: [{ key: { id: 'a' } }, { key: { id: 'b' } }] },
  };
  assert.equal(adapter.buildDedupeKey(payloadA), adapter.buildDedupeKey(payloadB));
});

test('el payload sanitizado no expone sessionId', () => {
  const result = adapter.normalizeWebhook({
    event: 'session.status',
    sessionId: 'api-key-real',
    data: { status: 'connected' },
  });
  assert.equal(result.events[0].kind, 'session_status');
  assert.equal(result.sanitizedPayload.sessionId, '[REDACTED]');
});
