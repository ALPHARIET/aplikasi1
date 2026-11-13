const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('Menghubungkan ke database...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'diploma_registry'
  });

  try {
    // 1. Ambil semua dokumen yang ada
    const [docs] = await conn.query(`
      SELECT d.*, s.student_id_number, s.full_name 
      FROM documents d 
      LEFT JOIN students s ON d.student_id = s.id
    `);

    console.log(`Ditemukan ${docs.length} dokumen dalam database:`);
    for (const doc of docs) {
      console.log(`- ID: ${doc.id} | ${doc.doc_title} | Mahasiswa: ${doc.full_name} (${doc.student_id_number}) | Status: ${doc.status}`);
      
      // Hapus berkas file fisik jika ada
      if (doc.file_path && fs.existsSync(doc.file_path)) {
        try {
          fs.unlinkSync(doc.file_path);
          console.log(`  🗑️ Berkas fisik dihapus: ${doc.file_path}`);
        } catch (err) {
          console.warn(`  ⚠️ Gagal menghapus file ${doc.file_path}:`, err.message);
        }
      }

      // Hapus berkas QR jika ada
      if (doc.qr_code_path && fs.existsSync(doc.qr_code_path)) {
        try {
          fs.unlinkSync(doc.qr_code_path);
          console.log(`  🗑️ Berkas QR dihapus: ${doc.qr_code_path}`);
        } catch (err) {
          console.warn(`  ⚠️ Gagal menghapus QR ${doc.qr_code_path}:`, err.message);
        }
      }
    }

    // 2. Bersihkan file di folder uploads
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const f of files) {
        const filePath = path.join(uploadsDir, f);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            console.log(`  🗑️ File uploads dihapus: ${f}`);
          }
        } catch (e) {
          console.warn(`  ⚠️ Gagal menghapus file uploads ${f}:`, e.message);
        }
      }
    }

    // 3. Reset document_id pada transcript_requests agar tidak foreign key violation
    await conn.query('UPDATE transcript_requests SET document_id = NULL WHERE document_id IS NOT NULL');

    // 4. Hapus data dokumen dari MySQL
    await conn.query('DELETE FROM documents');
    await conn.query('ALTER TABLE documents AUTO_INCREMENT = 1');

    console.log('✅ Semua data dokumen dan berkas fisik berhasil dihapus dan dibersihkan!');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Terjadi kesalahan:', err);
  process.exit(1);
});

