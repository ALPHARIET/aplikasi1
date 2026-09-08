const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixFileHashColumn() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'diploma_registry',
    });

    console.log('Altering file_hash column to VARCHAR(66)...');
    await connection.query('ALTER TABLE documents MODIFY file_hash VARCHAR(66)');
    console.log('✅ Column successfully updated!');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update column:', error);
    process.exit(1);
  }
}

fixFileHashColumn();
