const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { encryptSecret, decryptSecret, resolveEncryptionKey } = require('../utils/credentialCrypto');

test('cifra y descifra credenciales con AES-256-GCM', () => {
  const original = process.env.CREDENTIAL_ENCRYPTION_KEY;
  process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  try {
    const encrypted = encryptSecret('secreto-de-prueba');
    assert.notEqual(encrypted.ciphertext, 'secreto-de-prueba');
    assert.equal(decryptSecret(encrypted), 'secreto-de-prueba');
  } finally {
    if (typeof original === 'undefined') delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    else process.env.CREDENTIAL_ENCRYPTION_KEY = original;
  }
});

test('rechaza una llave de cifrado con longitud insegura', () => {
  const original = process.env.CREDENTIAL_ENCRYPTION_KEY;
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'corta';
  try {
    assert.throws(() => resolveEncryptionKey(), /32 bytes/);
  } finally {
    if (typeof original === 'undefined') delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    else process.env.CREDENTIAL_ENCRYPTION_KEY = original;
  }
});
