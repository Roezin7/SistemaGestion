const db = require('../db');

const PROMOTION_TYPES = new Set(['percentage', 'fixed_amount', 'special_price', 'promotional_message']);
const PRICE_CATEGORIES = new Set(['fee', 'official', 'additional', 'internal']);

async function getCatalog(oficinaId, { includeInactive = false } = {}) {
  const services = await db.query(
    `SELECT s.*,
      COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.category, p.id)
        FROM service_prices p WHERE p.service_id=s.id AND (p.oficina_id IS NULL OR p.oficina_id=$1)
          AND ($2::boolean OR p.active=TRUE)), '[]'::jsonb) AS prices,
      COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.sort_order, r.id)
        FROM service_requirements r WHERE r.service_id=s.id AND ($2::boolean OR r.active=TRUE)), '[]'::jsonb) AS requirements
      FROM services s WHERE ($2::boolean OR s.active=TRUE) ORDER BY s.name`,
    [oficinaId, includeInactive]
  );
  return services.rows;
}

async function getActivePromotions(oficinaId) {
  const result = await db.query(
    `SELECT p.*,
      COALESCE((SELECT jsonb_agg(service_id) FROM promotion_services ps WHERE ps.promotion_id=p.id),'[]') AS service_ids,
      COALESCE((SELECT jsonb_agg(oficina_id) FROM promotion_offices po WHERE po.promotion_id=p.id),'[]') AS office_ids
      FROM promotions p
      WHERE p.active=TRUE AND p.starts_at<=NOW() AND (p.ends_at IS NULL OR p.ends_at>NOW())
        AND (NOT EXISTS (SELECT 1 FROM promotion_offices po WHERE po.promotion_id=p.id)
          OR EXISTS (SELECT 1 FROM promotion_offices po WHERE po.promotion_id=p.id AND po.oficina_id=$1))
      ORDER BY p.priority DESC, p.id`,
    [oficinaId]
  );
  return result.rows;
}

async function getContexts(oficinaId) {
  const result = await db.query(
    `SELECT id, oficina_id, content, version, updated_at FROM agent_contexts
      WHERE oficina_id IS NULL OR oficina_id=$1 ORDER BY oficina_id NULLS FIRST`,
    [oficinaId]
  );
  return {
    global: result.rows.find((row) => row.oficina_id === null) || null,
    office: result.rows.find((row) => Number(row.oficina_id) === Number(oficinaId)) || null,
  };
}

async function updateContext(oficinaId, userId, content, global = false) {
  return db.withTransaction(async (client) => {
    const targetOffice = global ? null : oficinaId;
    let result = await client.query(
      `SELECT * FROM agent_contexts WHERE oficina_id IS NOT DISTINCT FROM $1 FOR UPDATE`,
      [targetOffice]
    );
    if (!result.rows[0]) {
      result = await client.query(
        'INSERT INTO agent_contexts(oficina_id,content,updated_by) VALUES ($1,$2,$3) RETURNING *',
        [targetOffice, String(content || '').trim(), userId]
      );
    } else {
      const previous = result.rows[0];
      await client.query(
        `INSERT INTO agent_context_history(context_id,oficina_id,content,version,changed_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [previous.id, previous.oficina_id, previous.content, previous.version, userId]
      );
      result = await client.query(
        `UPDATE agent_contexts SET content=$2,version=version+1,updated_by=$3,updated_at=NOW()
          WHERE id=$1 RETURNING *`,
        [previous.id, String(content || '').trim(), userId]
      );
    }
    return result.rows[0];
  });
}

async function updateService(id, input) {
  const current = await db.query('SELECT * FROM services WHERE id=$1', [id]);
  if (!current.rows[0]) return null;
  const row = current.rows[0];
  const result = await db.query(
    `UPDATE services SET name=$2,description=$3,process_summary=$4,estimated_time=$5,warnings=$6,
      special_case=$7,active=$8,updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, String(input.name ?? row.name).trim(), input.description ?? row.description,
      input.process_summary ?? row.process_summary, input.estimated_time ?? row.estimated_time,
      input.warnings ?? row.warnings, typeof input.special_case==='boolean'?input.special_case:row.special_case,
      typeof input.active==='boolean'?input.active:row.active]
  );
  return result.rows[0];
}

async function savePrice(oficinaId, userId, input, id = null) {
  if (!PRICE_CATEGORIES.has(input.category) || !['MXN', 'USD'].includes(input.currency)) {
    const error = new Error('Categoría o moneda inválida'); error.status = 400; throw error;
  }
  const amount = input.amount === '' || input.amount === null ? null : Number(input.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
    const error = new Error('Monto inválido'); error.status = 400; throw error;
  }
  if (id) {
    const result = await db.query(
      `UPDATE service_prices SET label=$3,amount=$4,currency=$5,conditions=$6,active=$7,
        updated_by=$8,updated_at=NOW() WHERE id=$1 AND (oficina_id IS NULL OR oficina_id=$2) RETURNING *`,
      [id, oficinaId, String(input.label || '').trim(), amount, input.currency, input.conditions || null,
        input.active !== false, userId]
    );
    return result.rows[0] || null;
  }
  const result = await db.query(
    `INSERT INTO service_prices(service_id,oficina_id,category,label,amount,currency,conditions,active,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [input.service_id, input.office_override ? oficinaId : null, input.category,
      String(input.label || '').trim(), amount, input.currency, input.conditions || null,
      input.active !== false, userId]
  );
  return result.rows[0];
}

async function saveRequirement(input, id = null) {
  const requirement=String(input.requirement||'').trim();
  if(!requirement){const error=new Error('El requisito es obligatorio');error.status=400;throw error;}
  if(id){const result=await db.query(`UPDATE service_requirements SET requirement=$2,required=$3,sort_order=$4,
    active=$5,updated_at=NOW() WHERE id=$1 RETURNING *`,[id,requirement,input.required!==false,Number(input.sort_order)||0,input.active!==false]);return result.rows[0]||null;}
  const service=await db.query('SELECT 1 FROM services WHERE id=$1',[input.service_id]);
  if(!service.rows[0]){const error=new Error('Servicio no encontrado');error.status=404;throw error;}
  const result=await db.query(`INSERT INTO service_requirements(service_id,requirement,required,sort_order,active)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,[input.service_id,requirement,input.required!==false,Number(input.sort_order)||0,input.active!==false]);return result.rows[0];
}

async function listPromotions(oficinaId) {
  const result = await db.query(
    `SELECT p.*,
      COALESCE((SELECT jsonb_agg(service_id) FROM promotion_services ps WHERE ps.promotion_id=p.id),'[]') AS service_ids,
      COALESCE((SELECT jsonb_agg(oficina_id) FROM promotion_offices po WHERE po.promotion_id=p.id),'[]') AS office_ids
      FROM promotions p WHERE NOT EXISTS(SELECT 1 FROM promotion_offices x WHERE x.promotion_id=p.id)
        OR EXISTS(SELECT 1 FROM promotion_offices x WHERE x.promotion_id=p.id AND x.oficina_id=$1)
      ORDER BY p.priority DESC,p.id`,[oficinaId]
  );
  return result.rows;
}

async function savePromotion(oficinaId, userId, input, id = null) {
  if (!PROMOTION_TYPES.has(input.type)) {
    const error = new Error('Tipo de promoción inválido'); error.status = 400; throw error;
  }
  if (!['fee','message_only'].includes(input.applies_to || 'fee')) {
    const error = new Error('Las promociones solo pueden aplicar a honorarios o mensaje comercial'); error.status = 400; throw error;
  }
  return db.withTransaction(async (client) => {
    const values = [String(input.name || '').trim(), input.description || null, input.type,
      input.percentage || null, input.fixed_amount || null, input.special_price || null,
      input.currency || 'MXN', input.applies_to || 'fee', input.starts_at || new Date(),
      input.ends_at || null, input.active !== false, input.commercial_text || null,
      input.terms || null, Number(input.priority) || 0, userId];
    let result;
    if (id) {
      result = await client.query(
        `UPDATE promotions SET name=$2,description=$3,type=$4,percentage=$5,fixed_amount=$6,
          special_price=$7,currency=$8,applies_to=$9,starts_at=$10,ends_at=$11,active=$12,
          commercial_text=$13,terms=$14,priority=$15,updated_by=$16,updated_at=NOW()
          WHERE id=$1 AND (NOT EXISTS(SELECT 1 FROM promotion_offices x WHERE x.promotion_id=promotions.id)
            OR EXISTS(SELECT 1 FROM promotion_offices x WHERE x.promotion_id=promotions.id AND x.oficina_id=$17)) RETURNING *`, [id, ...values, oficinaId]
      );
    } else {
      result = await client.query(
        `INSERT INTO promotions(name,description,type,percentage,fixed_amount,special_price,currency,
          applies_to,starts_at,ends_at,active,commercial_text,terms,priority,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15) RETURNING *`, values
      );
    }
    if (!result.rows[0]) return null;
    const promotionId = result.rows[0].id;
    await client.query('DELETE FROM promotion_services WHERE promotion_id=$1', [promotionId]);
    await client.query('DELETE FROM promotion_offices WHERE promotion_id=$1', [promotionId]);
    for (const serviceId of input.service_ids || []) {
      await client.query('INSERT INTO promotion_services(promotion_id,service_id) VALUES ($1,$2)', [promotionId, serviceId]);
    }
    for (const officeId of input.office_ids || []) {
      if(Number(officeId)!==Number(oficinaId)){const error=new Error('No se puede asignar una promoción a otra oficina');error.status=403;throw error;}
      await client.query('INSERT INTO promotion_offices(promotion_id,oficina_id) VALUES ($1,$2)', [promotionId, officeId]);
    }
    return result.rows[0];
  });
}

async function getKnowledgeForOffice(oficinaId) {
  const [catalog, promotions, contexts] = await Promise.all([
    getCatalog(oficinaId), getActivePromotions(oficinaId), getContexts(oficinaId),
  ]);
  return { catalog: catalog.map((service)=>({...service,prices:service.prices.filter((price)=>price.category!=='internal')})), promotions, contexts };
}

module.exports = { getCatalog, getActivePromotions, getContexts, updateContext, updateService,
  savePrice, saveRequirement, listPromotions, savePromotion, getKnowledgeForOffice };
