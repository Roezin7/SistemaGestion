const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, extractAdCodes } = require('../utils/phone');

test('normaliza telefonos mexicanos y JID sin conservar formato', () => {
  assert.equal(normalizePhone('55 1234 5678'), '525512345678');
  assert.equal(normalizePhone('+52 55 1234 5678@s.whatsapp.net'), '525512345678');
  assert.equal(normalizePhone('5215512345678'), '525512345678');
  assert.equal(normalizePhone('123'), null);
});

test('extrae codigos publicitarios exactos y sin duplicados', () => {
  assert.deepEqual(
    extractAdCodes('Hola cb-visa-turista y otra vez CB-VISA-TURISTA.'),
    ['CB-VISA-TURISTA']
  );
  assert.deepEqual(extractAdCodes('CB incompleto'), []);
  assert.deepEqual(extractAdCodes('Código CB-VISA'), ['CB-VISA']);
  assert.deepEqual(extractAdCodes('CB-A-B-C-D-E-F-G-H'), []);
});
