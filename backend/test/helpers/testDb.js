// Siapkan database khusus test (diploma_registry_test) dari berkas migrasi.
// Database demo/utama tidak pernah disentuh: nama database wajib berakhiran "_test".
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const TEST_DB_NAME = 'diploma_registry_test';
const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');
const ADMIN = { email: 'admin@univ.edu', password: 'adminpassword123' };

// 001_initial_schema.sql menulis "CREATE DATABASE diploma_registry; USE diploma_registry;".
// Baris itu dibuang supaya tabel dibuat di database test, bukan di database utama.
function loadMigrationSql() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(CREATE\s+DATABASE|USE)\b/i.test(line))
      .join('\n'))
    .join('\n');
}

async function resetTestDb() {
  if (!TEST_DB_NAME.endsWith('_test')) throw new Error('Menolak mereset database yang bukan database test');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
    await conn.query(`CREATE DATABASE \`${TEST_DB_NAME}\``);
    await conn.query(`USE \`${TEST_DB_NAME}\``);
    await conn.query(loadMigrationSql());
    const hash = await bcrypt.hash(ADMIN.password, 4);
    await conn.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Administrator', ADMIN.email, hash, 'admin']
    );
  } finally {
    await conn.end();
  }
}

module.exports = { TEST_DB_NAME, ADMIN, resetTestDb };
