-- Tabel Permintaan Transkrip Nilai Mahasiswa
CREATE TABLE IF NOT EXISTS transcript_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    purpose VARCHAR(255) NULL,
    status ENUM('pending', 'rejected', 'issued', 'cancelled') NOT NULL DEFAULT 'pending',
    reject_reason TEXT NULL,
    document_id INT NULL,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    processed_by INT NULL,
    pending_student_id INT GENERATED ALWAYS AS (IF(status = 'pending', student_id, NULL)) VIRTUAL,
    CONSTRAINT fk_tr_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_tr_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_tr_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_pending_request_per_student (pending_student_id),
    INDEX idx_tr_student_id (student_id),
    INDEX idx_tr_status (status)
);

