# Sistema migratorio Casa Blanca

Aplicación full-stack multi-oficina para clientes, prospectos y finanzas, ampliada con WhatsApp/WasenderAPI, bandeja compartida, catálogo comercial, agente OpenAI, agenda, seguimientos y reactivación controlada.

## Arquitectura operativa

- Express y PostgreSQL son la fuente de verdad. React consume rutas autenticadas y siempre trabaja en la oficina activa del token.
- Los webhooks se persisten antes de procesarse. Webhooks, salidas, IA, notificaciones, seguimientos y campañas usan colas PostgreSQL con `FOR UPDATE SKIP LOCKED`, reintentos y estados visibles.
- Los cuatro workers corren dentro del proceso web. Es sencillo para una sola instancia; en varias réplicas los bloqueos de fila impiden consumir el mismo trabajo. Las citas usan un bloqueo asesor por oficina y el mantenimiento un bloqueo global.
- La API key y el secreto de Wasender se cifran por oficina con AES-256-GCM. Nunca se devuelven a React ni se escriben en logs.
- El agente usa Responses API con salida JSON estricta. El modelo predeterminado es `gpt-5.6-luna`, sustituible mediante `OPENAI_MODEL`. La implementación sigue la [guía oficial de Responses](https://platform.openai.com/docs/guides/migrate-to-responses) y [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs).

## Interruptores seguros

El sistema se instala apagado. Para comenzar, deja `AGENT_AUTOMATION_ENABLED=false`, conexiones deshabilitadas y campañas automáticas desactivadas. Después de validar una oficina, habilita su conexión y configuración desde **WhatsApp**; el interruptor global de IA se cambia por variable y requiere reinicio.

La automatización nunca responde a clientes activos, conversaciones humanas/pausadas, fuentes sin código publicitario confirmado, bajas de contacto ni conversaciones con una cita. Una salida manual desde la app o teléfono transfiere la conversación a atención humana. Precios oficiales y costos internos nunca reciben descuentos.

## Variables

Usa [backend/.env.example](backend/.env.example) como inventario. Son obligatorias `DATABASE_URL`, `SECRET_KEY`, `CREDENTIAL_ENCRYPTION_KEY` y, al activar IA, `OPENAI_API_KEY`. Configura además los orígenes HTTPS del frontend. `WEBHOOK_PAYLOAD_RETENTION_DAYS` controla la eliminación diaria del cuerpo de webhooks ya terminados (mínimo 7, predeterminado 30 días).

No guardes `.env` en Git. La llave de cifrado debe representar exactamente 32 bytes y mantenerse estable; cambiarla exige volver a capturar las credenciales de todas las oficinas.

## Migraciones

Haz primero un respaldo verificable de PostgreSQL. No ejecutes `backend/schema.sql` en producción: recrea el esquema base y solo se usa para desarrollo.

Desde `backend`:

```bash
npm run migrate:whatsapp-system
```

El comando aplica en orden las fases 1 a 7. El ejecutor toma un bloqueo asesor, registra nombre y SHA-256 en `schema_migrations` y omite ejecuciones repetidas. Si el checksum de una migración ya aplicada no coincide, se detiene.

## Despliegue en Coolify

1. Respalda la base, registra el punto de restauración y carga las variables sin secretos en archivos versionados.
2. Despliega primero con `AGENT_AUTOMATION_ENABLED=false` y las conexiones/campañas deshabilitadas.
3. Ejecuta `npm run migrate:whatsapp-system` como tarea puntual contra la misma `DATABASE_URL`.
4. Despliega la imagen del `Dockerfile`. El proceso atiende `$PORT`, cierra workers y pool limpiamente ante `SIGTERM` y expone `GET /api/health/ready`.
5. Exige que readiness responda `200`; un `503 migrations_pending` significa que falta una tabla. Revisa también `GET /api/status` y los errores de workers.
6. En **WhatsApp**, captura credenciales, registra códigos `CB-…` y copia la URL pública del webhook. En Wasender suscribe `messages.upsert`, `messages.update` y `session.status`; también se admiten `messages.received` y `message.sent`. Verifica una recepción firmada y su aparición en **Bandeja**.
7. Prueba salida manual, entrega, transferencia, cita y notificación con números internos. Activa IA por último y solo en una oficina piloto.

Rollback: apaga `AGENT_AUTOMATION_ENABLED`, deshabilita conexiones y workers, cancela campañas y vuelve a la imagen anterior. Las migraciones son aditivas; no borres tablas durante una incidencia. Restaura el respaldo únicamente si el rollback de aplicación no basta.

## Módulos de interfaz

- **WhatsApp:** conexión cifrada, códigos de anuncio, agente, seguimientos y destinatario interno.
- **Bandeja:** filtros, mensajes, resumen, perfil, promociones, cita, pausa, transferencia y baja de contacto.
- **Conocimiento:** servicios, precios separados, requisitos, contexto versionado y promociones vigentes.
- **Agenda:** próximas llamadas, disponibilidad, zona horaria y horarios extraordinarios.
- **Reactivación:** selección manual o criterios automáticos, programación y métricas; automático permanece apagado por defecto.

## API principal

Las rutas de administración requieren JWT y validan la oficina activa: `/api/whatsapp`, `/api/conversations`, `/api/knowledge`, `/api/appointments` y `/api/reactivation`. El webhook público es `/api/whatsapp/webhook/:publicId` y exige `X-Webhook-Signature`.

Los fallos durables conservan intento y error en sus tablas. La vista `operational_failures` unifica fallos de webhook, salida, IA, notificación, seguimiento y reactivación para diagnóstico por `oficina_id`. Los logs son JSON estructurado y censuran claves, tokens, contraseñas y secretos.

## Verificación

```bash
cd backend
npm test

cd ../frontend/gestion-tramites-frontend
npm run build
```

Antes de producción, ejecuta las migraciones contra una copia de la base y repítelas para comprobar idempotencia. Los datos semilla actuales contienen 11 servicios, 32 conceptos de precio y 24 requisitos extraídos del manual operativo.

## WasenderAPI

La integración sigue la documentación oficial de [firma y configuración de webhooks](https://wasenderapi.com/api-docs/webhooks/webhook-setup), [mensajes entrantes/salientes](https://wasenderapi.com/api-docs/webhooks/webhook-message-upsert) y [estados](https://www.wasenderapi.com/api-docs/webhooks/webhook-message-update).
