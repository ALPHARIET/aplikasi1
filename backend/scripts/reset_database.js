const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function resetDatabase() {
  console.log('🔄 Memulai proses pengosongan seluruh tabel database...');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'diploma_registry'
  });

  try {
    // Matikan foreign key checks sementara untuk truncation / delete bersih
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Kosongkan transcript_requests
    await conn.query('TRUNCATE TABLE transcript_requests');
    console.log('✅ Tabel transcript_requests berhasil dikosongkan.');

    // 2. Kosongkan documents
    await conn.query('TRUNCATE TABLE documents');
    console.log('✅ Tabel documents berhasil dikosongkan.');

    // 3. Kosongkan students
    await conn.query('TRUNCATE TABLE students');
    console.log('✅ Tabel students berhasil dikosongkan.');

    // 4. Kosongkan users
    await conn.query('TRUNCATE TABLE users');
    console.log('✅ Tabel users berhasil dikosongkan.');

    // Hidupkan kembali foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    // 5. Buat kembali akun default Administrator
    const adminName = 'Administrator';
    const adminEmail = 'admin@univ.edu';
    const adminPassword = 'adminpassword123';
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);

    await conn.query(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (1, ?, ?, ?, ?)',
      [adminName, adminEmail, adminPasswordHash, 'admin']
    );
    console.log(`✅ Akun default Administrator dibuat ulang: ${adminEmail} (password: ${adminPassword})`);

    // 6. Bersihkan file berkas fisik di folder uploads
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedFilesCount = 0;
      for (const f of files) {
        const filePath = path.join(uploadsDir, f);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
          }
        } catch (e) {
          console.warn(`⚠️ Gagal menghapus file uploads/${f}:`, e.message);
        }
      }
      console.log(`✅ Folder uploads dibersihkan (${deletedFilesCount} file dihapus).`);
    }

    console.log('\n=============================================================');
    console.log('🎉 SELURUH TABEL DATABASE TELAH BERHASIL DIKOSONGKAN!');
    console.log('=============================================================');
  } catch (error) {
    console.error('❌ Gagal mengosongkan database:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

resetDatabase();

