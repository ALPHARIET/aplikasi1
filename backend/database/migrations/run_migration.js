const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  console.log('Running database migrations...');
  
  try {
    // Connect without database selected first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true // allow executing multiple queries in one string
    });

    // Create database if not exists
    const dbName = process.env.DB_NAME || 'diploma_registry';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' ensured`);

    // Use the database
    await connection.query(`USE \`${dbName}\``);

    // Read SQL file
    const sqlFile = path.join(__dirname, '001_initial_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute SQL
    await connection.query(sql);
    console.log('✅ Tables created successfully');

    await connection.end();
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
