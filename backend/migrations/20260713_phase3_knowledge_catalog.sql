-- Fase 3: conocimiento estructurado, precios y promociones.
BEGIN;

CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    process_summary TEXT,
    estimated_time TEXT,
    warnings TEXT,
    special_case BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_prices (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
    category VARCHAR(24) NOT NULL,
    label VARCHAR(200) NOT NULL,
    amount NUMERIC(12,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    conditions TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT service_prices_category_check CHECK (category IN ('fee','official','additional','internal')) NOT VALID,
    CONSTRAINT service_prices_currency_check CHECK (currency IN ('MXN','USD')) NOT VALID
);

CREATE INDEX IF NOT EXISTS idx_service_prices_lookup ON service_prices (service_id, oficina_id, active);

CREATE TABLE IF NOT EXISTS service_requirements (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_contexts (
    id BIGSERIAL PRIMARY KEY,
    oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_context_global ON agent_contexts ((1)) WHERE oficina_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_context_office ON agent_contexts (oficina_id) WHERE oficina_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS agent_context_history (
    id BIGSERIAL PRIMARY KEY,
    context_id BIGINT NOT NULL REFERENCES agent_contexts(id) ON DELETE CASCADE,
    oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version INTEGER NOT NULL,
    changed_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,
    percentage NUMERIC(7,2),
    fixed_amount NUMERIC(12,2),
    special_price NUMERIC(12,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    applies_to VARCHAR(30) NOT NULL DEFAULT 'fee',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    commercial_text TEXT,
    terms TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT promotions_type_check CHECK (type IN ('percentage','fixed_amount','special_price','promotional_message')) NOT VALID,
    CONSTRAINT promotions_applies_check CHECK (applies_to IN ('fee','official','additional','total','message_only')) NOT VALID
);

CREATE TABLE IF NOT EXISTS promotion_services (
    promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (promotion_id, service_id)
);

CREATE TABLE IF NOT EXISTS promotion_offices (
    promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    PRIMARY KEY (promotion_id, oficina_id)
);

INSERT INTO services (code, name, description, process_summary, estimated_time, warnings, special_case)
VALUES
 ('US_VISA_FIRST_INDIVIDUAL','Visa americana B1/B2 primera vez individual','Solicitud individual de visa de visitante.','Prevalidar, integrar expediente, DS-160, pago y citas CAS/Consulado.','1 a 10 meses','No prometer aprobación ni fecha. Separar CAS y Consulado al menos 72 horas.',FALSE),
 ('US_VISA_FIRST_FAMILY_ADULT','Visa americana B1/B2 familiar adulto','Solicitante adulto dentro de trámite familiar.','Expediente individual dentro del grupo familiar y dos citas.','1 a 10 meses','Cada integrante requiere expediente individual.',FALSE),
 ('US_VISA_FIRST_FAMILY_CHILD_9','Visa americana familiar menor de 9 años','Menor de 9 años dentro de trámite familiar.','Validar edad, documentos y reglas consulares vigentes.','1 a 10 meses','Confirmar edades y composición familiar.',FALSE),
 ('US_VISA_FIRST_CHILD_3','Visa americana menor de 3 años','Solicitud para menor de 3 años.','Validar documentos del menor y tutores.','1 a 10 meses','Confirmar edad exacta.',FALSE),
 ('US_VISA_RENEW_ADULT','Renovación visa americana adulto','Renovación de visa B1/B2.','Validar visa anterior, integrar expediente y CAS; entrevista si la autoridad la solicita.','1 a 3 meses','Solo tratar como renovación si B1/B2 venció hace máximo 12 meses.',FALSE),
 ('US_VISA_RENEW_CHILD_9','Renovación visa menor de 9 años','Renovación para menor de 9 años.','Validar visa anterior, edad y documentos.','1 a 3 meses','La autoridad puede solicitar entrevista.',FALSE),
 ('US_VISA_RENEW_CHILD_3','Renovación visa menor de 3 años','Renovación para menor de 3 años.','Validar visa anterior, edad y documentos.','1 a 3 meses','La autoridad puede solicitar entrevista.',FALSE),
 ('CANADA_VISITOR','Visa canadiense visitante','Proceso digital para visitante.','Integrar expediente digital y biométricos CAS.','Indefinido','No manejar tiempos cerrados; depende de Canadá.',FALSE),
 ('MX_PASSPORT_APPOINTMENT','Cita de pasaporte mexicano','Gestión de cita ante SRE.','Validar documentos y agendar ante SRE.','1 a 15 días','La entrega normalmente es el mismo día, con posibles excepciones.',FALSE),
 ('US_PASSPORT','Pasaporte americano','Trámite para ciudadano estadounidense.','Confirmar ciudadanía, documentos y canal autorizado.','Cita 1 a 2 meses; entrega 1 a 3 meses','No se entrega el mismo día.',FALSE),
 ('EXTERNAL_DOCUMENTS','Elaboración de documentos externos','Documentos y trámites sujetos a validación.','Validar el caso antes de confirmar costo o tiempo.','Variable','Siempre transferir casos legales, residencia o ciudadanía para validación.',TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO service_prices (service_id, category, label, amount, currency, conditions)
SELECT s.id, v.category, v.label, v.amount, v.currency, v.conditions
FROM (VALUES
 ('US_VISA_FIRST_INDIVIDUAL','fee','Honorarios Casa Blanca',8000,'MXN',NULL),('US_VISA_FIRST_INDIVIDUAL','official','Pago oficial adulto',185,'USD','Adultos'),('US_VISA_FIRST_INDIVIDUAL','official','Pago oficial menor',15,'USD','Menores de 10 años'),('US_VISA_FIRST_INDIVIDUAL','additional','Envío al aprobarse',320,'MXN','Por persona'),
 ('US_VISA_FIRST_FAMILY_ADULT','fee','Honorarios Casa Blanca',8800,'MXN',NULL),('US_VISA_FIRST_FAMILY_ADULT','official','Pago oficial',185,'USD',NULL),('US_VISA_FIRST_FAMILY_ADULT','additional','Envío',320,'MXN',NULL),
 ('US_VISA_FIRST_FAMILY_CHILD_9','fee','Honorarios Casa Blanca',6000,'MXN',NULL),('US_VISA_FIRST_FAMILY_CHILD_9','official','Pago oficial',15,'USD','Menor de 10 años'),('US_VISA_FIRST_FAMILY_CHILD_9','additional','Envío',320,'MXN',NULL),
 ('US_VISA_FIRST_CHILD_3','fee','Honorarios Casa Blanca',4000,'MXN',NULL),('US_VISA_FIRST_CHILD_3','official','Pago oficial',15,'USD','Menor de 10 años'),('US_VISA_FIRST_CHILD_3','additional','Envío',320,'MXN',NULL),
 ('US_VISA_RENEW_ADULT','fee','Honorarios Casa Blanca',4000,'MXN',NULL),('US_VISA_RENEW_ADULT','official','Pago oficial',185,'USD',NULL),('US_VISA_RENEW_ADULT','additional','Envío',320,'MXN',NULL),
 ('US_VISA_RENEW_CHILD_9','fee','Honorarios Casa Blanca',6000,'MXN',NULL),('US_VISA_RENEW_CHILD_9','official','Pago oficial',15,'USD','Menor de 10 años'),('US_VISA_RENEW_CHILD_9','additional','Envío',320,'MXN',NULL),
 ('US_VISA_RENEW_CHILD_3','fee','Honorarios Casa Blanca',3500,'MXN',NULL),('US_VISA_RENEW_CHILD_3','official','Pago oficial',15,'USD','Menor de 10 años'),('US_VISA_RENEW_CHILD_3','additional','Envío',320,'MXN',NULL),
 ('CANADA_VISITOR','fee','Honorarios Casa Blanca',5000,'MXN',NULL),('CANADA_VISITOR','official','Pago oficial',185,'USD','Adultos y menores'),
 ('MX_PASSPORT_APPOINTMENT','fee','Honorarios de cita',350,'MXN',NULL),('MX_PASSPORT_APPOINTMENT','official','Pasaporte 3 años',1795,'MXN',NULL),('MX_PASSPORT_APPOINTMENT','official','Pasaporte 6 años',2455,'MXN',NULL),('MX_PASSPORT_APPOINTMENT','official','Pasaporte 10 años',3940,'MXN',NULL),
 ('US_PASSPORT','fee','Honorarios Casa Blanca',4000,'MXN',NULL),('US_PASSPORT','official','Pago oficial',165,'USD',NULL),
 ('EXTERNAL_DOCUMENTS','fee','Precio al cliente',1200,'MXN','Sujeto a validación'),('EXTERNAL_DOCUMENTS','internal','Costo interno',700,'MXN','No mostrar al prospecto')
) AS v(code,category,label,amount,currency,conditions)
JOIN services s ON s.code = v.code
WHERE NOT EXISTS (SELECT 1 FROM service_prices p WHERE p.service_id=s.id AND p.oficina_id IS NULL AND p.category=v.category AND p.label=v.label);

INSERT INTO service_requirements (service_id, requirement, sort_order)
SELECT s.id, v.requirement, v.sort_order
FROM (VALUES
 ('US_VISA_FIRST_INDIVIDUAL','Acta de nacimiento original',1),('US_VISA_FIRST_INDIVIDUAL','CURP a color',2),('US_VISA_FIRST_INDIVIDUAL','INE por ambos lados',3),('US_VISA_FIRST_INDIVIDUAL','Pasaporte vigente',4),('US_VISA_FIRST_INDIVIDUAL','Comprobante de domicilio reciente',5),
 ('US_VISA_RENEW_ADULT','Acta de nacimiento',1),('US_VISA_RENEW_ADULT','Pasaporte vigente',2),('US_VISA_RENEW_ADULT','CURP e INE',3),('US_VISA_RENEW_ADULT','Comprobante de domicilio',4),('US_VISA_RENEW_ADULT','Visa anterior vencida',5),('US_VISA_RENEW_ADULT','Dos juegos de copias',6),
 ('CANADA_VISITOR','Acta de nacimiento original',1),('CANADA_VISITOR','Pasaporte vigente',2),('CANADA_VISITOR','CURP a color',3),('CANADA_VISITOR','INE',4),('CANADA_VISITOR','Comprobante de domicilio',5),
 ('MX_PASSPORT_APPOINTMENT','Acta de nacimiento original y reciente',1),('MX_PASSPORT_APPOINTMENT','CURP reciente y certificada',2),('MX_PASSPORT_APPOINTMENT','INE',3),('MX_PASSPORT_APPOINTMENT','Comprobante de domicilio',4),
 ('US_PASSPORT','Acta o certificado de nacimiento estadounidense',1),('US_PASSPORT','Número de Seguro Social',2),('US_PASSPORT','Identificación oficial vigente',3),('US_PASSPORT','Prueba de ciudadanía estadounidense',4)
) AS v(code,requirement,sort_order)
JOIN services s ON s.code=v.code
WHERE NOT EXISTS (SELECT 1 FROM service_requirements r WHERE r.service_id=s.id AND r.requirement=v.requirement);

INSERT INTO promotions (name, description, type, percentage, applies_to, active, commercial_text, terms, priority)
SELECT '50 % de descuento en honorarios','Descuento únicamente sobre honorarios de Casa Blanca.','percentage',50,'fee',TRUE,
       'Aprovecha 50 % de descuento en nuestros honorarios.','No aplica a pagos oficiales, gubernamentales, envíos ni cargos externos.',100
WHERE NOT EXISTS (SELECT 1 FROM promotions WHERE name='50 % de descuento en honorarios');

INSERT INTO agent_contexts (oficina_id, content) SELECT NULL, ''
WHERE NOT EXISTS (SELECT 1 FROM agent_contexts WHERE oficina_id IS NULL);
INSERT INTO agent_contexts (oficina_id, content) SELECT id, '' FROM oficinas
ON CONFLICT (oficina_id) WHERE oficina_id IS NOT NULL DO NOTHING;

COMMIT;
