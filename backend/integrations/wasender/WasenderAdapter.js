const crypto = require('crypto');
const { normalizePhone } = require('../../utils/phone');
const { sanitize } = require('../../utils/structuredLogger');

const STATUS_BY_CODE = {
  0: 'failed',
  1: 'pending',
  2: 'sent',
  3: 'delivered',
  4: 'read',
  5: 'read',
};

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const milliseconds = numeric < 100000000000 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMessageBody(messageEntry) {
  const rawMessage = messageEntry?.message || {};
  return messageEntry?.messageBody
    || rawMessage.conversation
    || rawMessage.extendedTextMessage?.text
    || rawMessage.imageMessage?.caption
    || rawMessage.videoMessage?.caption
    || rawMessage.documentMessage?.caption
    || null;
}

function getMessageType(messageEntry) {
  const rawMessage = messageEntry?.message || {};
  if (rawMessage.imageMessage) return 'image';
  if (rawMessage.videoMessage) return 'video';
  if (rawMessage.audioMessage) return 'audio';
  if (rawMessage.documentMessage) return 'document';
  if (rawMessage.stickerMessage) return 'sticker';
  if (rawMessage.locationMessage) return 'location';
  if (rawMessage.contactMessage || rawMessage.contactsArrayMessage) return 'contact';
  return 'text';
}

function getMediaMetadata(messageEntry) {
  const rawMessage = messageEntry?.message || {};
  const media = rawMessage.imageMessage
    || rawMessage.videoMessage
    || rawMessage.audioMessage
    || rawMessage.documentMessage
    || rawMessage.stickerMessage;

  if (!media) return null;

  return sanitize({
    mimetype: media.mimetype || null,
    fileLength: media.fileLength || null,
    fileName: media.fileName || null,
    fileSha256: media.fileSha256 || null,
  });
}

function toMessageEntries(payload) {
  const messages = payload?.data?.messages;
  if (Array.isArray(messages)) return messages;
  if (messages && typeof messages === 'object') return [messages];

  if (payload?.data?.key || payload?.data?.message) {
    return [{
      key: payload.data.key,
      message: payload.data.message,
      messageBody: payload.data.messageBody,
      pushName: payload.data.pushName,
      messageTimestamp: payload.data.messageTimestamp,
    }];
  }

  return [];
}

function normalizeMessage(entry, payload) {
  const key = entry?.key || {};
  const fromMe = Boolean(key.fromMe);
  const remoteJid = key.remoteJid || entry?.remoteJid || payload?.data?.to || null;
  const rawPhone = fromMe
    ? key.cleanedRecipientPn || key.recipientPn || remoteJid
    : key.cleanedSenderPn || key.senderPn || remoteJid;

  return {
    kind: 'message',
    externalMessageId: key.id ? String(key.id) : (payload?.data?.id ? String(payload.data.id) : null),
    remoteJid: remoteJid ? String(remoteJid) : null,
    phoneNormalized: normalizePhone(rawPhone),
    displayName: entry?.pushName || payload?.data?.pushName || null,
    direction: fromMe ? 'outbound' : 'inbound',
    senderType: fromMe ? 'employee' : 'prospect',
    source: fromMe ? 'phone' : 'webhook',
    messageType: getMessageType(entry),
    body: getMessageBody(entry),
    mediaMetadata: getMediaMetadata(entry),
    status: payload?.data?.success === false ? 'failed' : (fromMe ? 'sent' : 'delivered'),
    providerTimestamp: normalizeTimestamp(
      entry?.messageTimestamp || payload?.timestamp
    ),
  };
}

function normalizeStatus(payload) {
  const key = payload?.data?.key || {};
  const rawStatus = payload?.data?.update?.status ?? payload?.data?.status;
  const numericStatus = Number(rawStatus);
  const status = STATUS_BY_CODE[numericStatus]
    || (['pending', 'sent', 'delivered', 'read', 'failed'].includes(String(rawStatus).toLowerCase())
      ? String(rawStatus).toLowerCase()
      : null);

  if (!key.id || !status) return [];
  return [{
    kind: 'status',
    externalMessageId: String(key.id),
    status,
    providerTimestamp: normalizeTimestamp(payload?.timestamp),
  }];
}

function normalizeWebhook(payload) {
  const eventType = String(payload?.event || '').trim();
  if (!eventType) {
    const error = new Error('El webhook no contiene event');
    error.code = 'INVALID_WASENDER_EVENT';
    throw error;
  }

  let events = [];
  if (['messages.received', 'messages.upsert', 'message.sent'].includes(eventType)) {
    events = toMessageEntries(payload).map((entry) => normalizeMessage(entry, payload));
  } else if (['messages.update', 'message-receipt.update'].includes(eventType)) {
    events = normalizeStatus(payload);
  } else if (eventType === 'session.status') {
    events = [{
      kind: 'session_status',
      status: String(payload?.data?.status || 'unknown').toLowerCase(),
      providerTimestamp: normalizeTimestamp(payload?.timestamp),
    }];
  }

  return {
    eventType,
    events,
    sanitizedPayload: sanitize(payload),
  };
}

function buildDedupeKey(payload) {
  const eventType = String(payload?.event || 'unknown');
  const messageEntries = toMessageEntries(payload);
  const externalIds = messageEntries.map((entry) => entry?.key?.id).filter(Boolean).sort();
  const key = payload?.data?.key || payload?.data?.messages?.key || {};
  const externalId = externalIds.join(',') || key.id || payload?.data?.id || null;
  const status = payload?.data?.update?.status ?? payload?.data?.status ?? '';
  const material = externalId
    ? `${eventType}:${externalId}:${status}`
    : JSON.stringify(sanitize(payload));
  return crypto.createHash('sha256').update(material).digest('hex');
}

module.exports = {
  STATUS_BY_CODE,
  normalizeTimestamp,
  normalizeWebhook,
  buildDedupeKey,
};
