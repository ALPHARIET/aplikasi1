-- Catat kapan kata sandi terakhir diubah. Token JWT yang terbit sebelum waktu ini
-- ditolak (lihat authMiddleware.verifyToken), jadi sesi lama berakhir setelah ganti sandi.
-- Dibuat idempoten: aman dijalankan ulang oleh run_migration.js.
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_changed_at');
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL', 'SELECT 1');
PREPARE add_password_changed_at FROM @ddl;
EXECUTE add_password_changed_at;
DEALLOCATE PREPARE add_password_changed_at;
