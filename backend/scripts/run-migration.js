const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const MIGRATION_LOCK_ID = 731945271;

async function main() {
  const migrationArg = process.argv[2];

  if (!migrationArg) {
    console.error('Uso: node scripts/run-migration.js <ruta-del-archivo-sql>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Falta la variable DATABASE_URL.');
    process.exit(1);
  }

  const migrationPath = path.resolve(process.cwd(), migrationArg);
  if (!fs.existsSync(migrationPath)) {
    console.error(`No se encontro el archivo de migracion: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const migrationName = path.basename(migrationPath);
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let client;
  let lockAcquired = false;

  try {
    client = await pool.connect();
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await client.query(
      'SELECT checksum, applied_at FROM schema_migrations WHERE name = $1',
      [migrationName]
    );

    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`La migracion ${migrationName} ya fue aplicada con un checksum diferente`);
      }

      console.log(`Migracion ya aplicada: ${migrationName}`);
      return;
    }

    console.log(`Ejecutando migracion: ${migrationPath}`);
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
      [migrationName, checksum]
    );
    console.log('Migracion completada correctamente.');
  } catch (error) {
    console.error('Error ejecutando la migracion:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (client && lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      } catch (unlockError) {
        console.error('No se pudo liberar el bloqueo de migraciones:', unlockError.message);
      }
    }
    client?.release();
    await pool.end();
  }
}

main();
