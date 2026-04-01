const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

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
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Ejecutando migracion: ${migrationPath}`);
    await pool.query(sql);
    console.log('Migracion completada correctamente.');
  } catch (error) {
    console.error('Error ejecutando la migracion:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
