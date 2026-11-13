const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  const targetFile = process.argv[2];
  console.log(`Running database migration${targetFile ? ` for ${targetFile}` : 's'}...`);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'diploma_registry';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    const filesToRun = targetFile
      ? [targetFile]
      : fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();

    for (const file of filesToRun) {
      const sqlFile = path.isAbsolute(file) ? file : path.join(__dirname, file);
      if (!fs.existsSync(sqlFile)) {
        throw new Error(`File not found: ${sqlFile}`);
      }
      console.log(`Executing ${path.basename(sqlFile)}...`);
      const sql = fs.readFileSync(sqlFile, 'utf8');
      await connection.query(sql);
      console.log(`✅ ${path.basename(sqlFile)} executed successfully`);
    }

    await connection.end();
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message || error);
    process.exit(1);
  }
}

runMigration();
