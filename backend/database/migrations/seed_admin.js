const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seedAdmin() {
  console.log('Seeding Admin User...');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'diploma_registry',
    });

    // Check if admin already exists
    const [existing] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@univ.edu']);
    if (existing.length > 0) {
      console.log('✅ Admin user already exists. Skipping...');
      process.exit(0);
    }

    const name = 'Administrator';
    const email = 'admin@univ.edu';
    const password = 'adminpassword123'; // Hardcoded for demo, change in prod
    const role = 'admin';

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await connection.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role]
    );

    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed admin:', error);
    process.exit(1);
  }
}

seedAdmin();
