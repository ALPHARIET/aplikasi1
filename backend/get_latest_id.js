const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'z:/tugas informatika/capstone/aplikasi1/backend/.env' });

async function getLatestDoc() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'diploma_registry',
    });

    const [rows] = await connection.query('SELECT verification_id, doc_title FROM documents ORDER BY created_at DESC LIMIT 1');
    
    if (rows.length > 0) {
      console.log(`LATEST_ID:${rows[0].verification_id}`);
      console.log(`TITLE:${rows[0].doc_title}`);
    } else {
      console.log('NO_DOCUMENTS_FOUND');
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

getLatestDoc();
