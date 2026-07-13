const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function resolveEncryptionKey() {
  const configured = String(process.env.CREDENTIAL_ENCRYPTION_KEY || '').trim();
  if (!configured) {
    const error = new Error('CREDENTIAL_ENCRYPTION_KEY no esta configurada');
    error.code = 'CREDENTIAL_ENCRYPTION_KEY_MISSING';
    throw error;
  }

  let key;
  if (/^[a-f0-9]{64}$/i.test(configured)) {
    key = Buffer.from(configured, 'hex');
  } else {
    try {
      const decoded = Buffer.from(configured, 'base64');
      key = decoded.length === 32 ? decoded : Buffer.from(configured, 'utf8');
    } catch {
      key = Buffer.from(configured, 'utf8');
    }
  }

  if (key.length !== 32) {
    const error = new Error('CREDENTIAL_ENCRYPTION_KEY debe representar exactamente 32 bytes');
    error.code = 'CREDENTIAL_ENCRYPTION_KEY_INVALID';
    throw error;
  }

  return key;
}

function encryptSecret(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, resolveEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value.trim(), 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptSecret({ ciphertext, iv, tag }) {
  if (!ciphertext || !iv || !tag) {
    return null;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    resolveEncryptionKey(),
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  encryptSecret,
  decryptSecret,
  resolveEncryptionKey,
};
