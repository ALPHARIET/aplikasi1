-- Membuat database jika belum ada
CREATE DATABASE IF NOT EXISTS diploma_registry;
USE diploma_registry;

-- Tabel Users (Admin & Mahasiswa)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Tabel Students (Profil Khusus Mahasiswa)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    student_id_number VARCHAR(50) NOT NULL UNIQUE, -- NIM/NIS
    full_name VARCHAR(100) NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    program VARCHAR(100),
    graduation_year INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student_id_number (student_id_number)
);

-- Tabel Documents (Ijazah/Transkrip)
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    verification_id VARCHAR(100) NOT NULL UNIQUE, -- ID Unik untuk QR dan URL
    student_id INT NOT NULL,
    doc_type ENUM('ijazah', 'transkrip') NOT NULL,
    doc_title VARCHAR(255) NOT NULL,
    file_path VARCHAR(255), -- Lokasi file di server
    file_hash VARCHAR(66), -- SHA-256 Hash dari file dokumen (64 chars + '0x')
    status ENUM('pending', 'issued', 'revoked') NOT NULL DEFAULT 'pending',
    tx_hash VARCHAR(66), -- Transaction hash dari blockchain
    block_number INT,
    issuer_address VARCHAR(42),
    issued_at DATETIME,
    qr_code_path VARCHAR(255), -- Lokasi file QR Code
    revocation_reason TEXT,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_verification_id (verification_id),
    INDEX idx_student_id (student_id),
    INDEX idx_status (status),
    INDEX idx_file_hash (file_hash)
);
