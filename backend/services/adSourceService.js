const db = require('../db');
const { extractAdCodes } = require('../utils/phone');

function normalizeCode(value) {
  const codes = extractAdCodes(value);
  return codes.length === 1 && codes[0] === String(value || '').trim().toUpperCase()
    ? codes[0]
    : null;
}

async function listAdSources(oficinaId) {
  const result = await db.query(
    `SELECT id, oficina_id, code, name, campaign_name, service_code, source_type,
            active, created_at, updated_at
     FROM ad_sources
     WHERE oficina_id = $1
     ORDER BY active DESC, name ASC, id ASC`,
    [oficinaId]
  );
  return result.rows;
}

async function createAdSource(oficinaId, userId, input) {
  const code = normalizeCode(input.code);
  const name = String(input.name || '').trim();
  if (!code || !name) {
    const error = new Error('Codigo publicitario valido y nombre son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `INSERT INTO ad_sources
       (oficina_id, code, name, campaign_name, service_code, active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING *`,
    [
      oficinaId,
      code,
      name,
      String(input.campaign_name || '').trim() || null,
      String(input.service_code || '').trim() || null,
      input.active !== false,
      userId,
    ]
  );
  return result.rows[0];
}

async function updateAdSource(oficinaId, adSourceId, userId, input) {
  const current = await db.query(
    'SELECT * FROM ad_sources WHERE id = $1 AND oficina_id = $2',
    [adSourceId, oficinaId]
  );
  if (!current.rows[0]) return null;

  const row = current.rows[0];
  const code = Object.prototype.hasOwnProperty.call(input, 'code')
    ? normalizeCode(input.code)
    : row.code;
  const name = Object.prototype.hasOwnProperty.call(input, 'name')
    ? String(input.name || '').trim()
    : row.name;
  if (!code || !name) {
    const error = new Error('Codigo publicitario valido y nombre son obligatorios');
    error.status = 400;
    throw error;
  }

  const result = await db.query(
    `UPDATE ad_sources
     SET code = $1,
         name = $2,
         campaign_name = $3,
         service_code = $4,
         active = $5,
         updated_by = $6,
         updated_at = NOW()
     WHERE id = $7 AND oficina_id = $8
     RETURNING *`,
    [
      code,
      name,
      Object.prototype.hasOwnProperty.call(input, 'campaign_name')
        ? String(input.campaign_name || '').trim() || null
        : row.campaign_name,
      Object.prototype.hasOwnProperty.call(input, 'service_code')
        ? String(input.service_code || '').trim() || null
        : row.service_code,
      typeof input.active === 'boolean' ? input.active : row.active,
      userId,
      adSourceId,
      oficinaId,
    ]
  );
  return result.rows[0];
}

module.exports = {
  normalizeCode,
  listAdSources,
  createAdSource,
  updateAdSource,
};
