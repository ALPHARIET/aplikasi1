const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const StudentModel = require('../models/studentModel');
const UserModel = require('../models/userModel');
const DocumentModel = require('../models/documentModel');
const TranscriptRequestModel = require('../models/transcriptRequestModel');

const StudentPortalController = {
  // 1. Profil Mahasiswa (Hanya data diri sendiri dari token)
  getMe: async (req, res) => {
    try {
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Profil mahasiswa tidak ditemukan' });
      }

      res.json({
        student: {
          id: student.id,
          studentIdNumber: student.student_id_number,
          fullName: student.full_name,
          email: student.email,
          faculty: student.faculty,
          program: student.program,
          graduationYear: student.graduation_year
        }
      });
    } catch (error) {
      console.error('Get Me Error:', error);
      res.status(500).json({ error: 'Gagal mengambil data profil mahasiswa' });
    }
  },

  // 2. Ubah Kata Sandi
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Semua kolom kata sandi wajib diisi' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Konfirmasi kata sandi baru tidak cocok' });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama' });
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }

      // Ambil user lengkap beserta password_hash
      const fullUser = await UserModel.findByEmail(user.email);
      const isMatch = await bcrypt.compare(currentPassword, fullUser.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Kata sandi saat ini tidak sesuai' });
      }

      const saltRounds = 10;
      const newHash = await bcrypt.hash(newPassword, saltRounds);
      await UserModel.updatePassword(req.user.id, newHash);

      res.json({ message: 'Kata sandi berhasil diubah. Silakan masuk kembali.' });
    } catch (error) {
      console.error('Change Password Error:', error);
      res.status(500).json({ error: 'Gagal mengubah kata sandi' });
    }
  },

  // 3. Ajukan Permintaan Transkrip Nilai
  requestTranscript: async (req, res) => {
    try {
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Profil mahasiswa tidak ditemukan' });
      }

      // Validasi: Mahasiswa hanya boleh memiliki satu permintaan berstatus pending
      const activePending = await TranscriptRequestModel.getActivePendingByStudentId(student.id);
      if (activePending) {
        return res.status(400).json({
          error: 'Anda masih memiliki permintaan transkrip nilai yang sedang menunggu diproses.'
        });
      }

      const { purpose } = req.body;
      const cleanPurpose = purpose && typeof purpose === 'string' ? purpose.trim() : null;

      try {
        const requestId = await TranscriptRequestModel.create({
          studentId: student.id,
          purpose: cleanPurpose
        });

        res.status(201).json({
          message: 'Permintaan transkrip nilai berhasil diajukan',
          requestId
        });
      } catch (dbErr) {
        if (dbErr.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({
            error: 'Anda masih memiliki permintaan transkrip nilai yang sedang menunggu diproses.'
          });
        }
        throw dbErr;
      }
    } catch (error) {
      console.error('Request Transcript Error:', error);
      res.status(500).json({ error: 'Gagal mengajukan permintaan transkrip nilai' });
    }
  },

  // 4. Riwayat Permintaan Transkrip Milik Sendiri
  getMyRequests: async (req, res) => {
    try {
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Profil mahasiswa tidak ditemukan' });
      }

      const requests = await TranscriptRequestModel.getByStudentId(student.id);
      res.json({ requests });
    } catch (error) {
      console.error('Get My Requests Error:', error);
      res.status(500).json({ error: 'Gagal mengambil riwayat permintaan transkrip' });
    }
  },

  // 5. Batalkan Permintaan Transkrip Milik Sendiri (Hanya jika 'pending')
  cancelRequest: async (req, res) => {
    try {
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Profil mahasiswa tidak ditemukan' });
      }

      const { id } = req.params;
      const success = await TranscriptRequestModel.cancel(id, student.id);

      if (!success) {
        return res.status(400).json({
          error: 'Permintaan tidak dapat dibatalkan (hanya permintaan berstatus pending yang dapat dibatalkan).'
        });
      }

      res.json({ message: 'Permintaan transkrip nilai berhasil dibatalkan' });
    } catch (error) {
      console.error('Cancel Request Error:', error);
      res.status(500).json({ error: 'Gagal membatalkan permintaan transkrip nilai' });
    }
  },

  // 6. Daftar Dokumen Transkrip Milik Sendiri
  getMyDocuments: async (req, res) => {
    try {
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Profil mahasiswa tidak ditemukan' });
      }

      const docs = await DocumentModel.getByStudentId(student.id);
      res.json({ documents: docs });
    } catch (error) {
      console.error('Get My Documents Error:', error);
      res.status(500).json({ error: 'Gagal mengambil dokumen transkrip nilai' });
    }
  },

  // 7. Unduh Dokumen Terautentikasi (Cek Kepemilikan Dokumen)
  downloadDocument: async (req, res) => {
    try {
      const student = await StudentModel.getByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: 'Profil mahasiswa tidak ditemukan' });
      }

      const { id } = req.params;
      let doc = null;

      // Cek apakah parameter ID berupa ID integer atau verification_id string
      if (isNaN(id)) {
        doc = await DocumentModel.getByVerificationId(id);
      } else {
        const [rows] = await require('../config/database').query(
          'SELECT * FROM documents WHERE id = ?',
          [id]
        );
        doc = rows[0];
      }

      if (!doc) {
        return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
      }

      // Validasi kepemilikan: Mahasiswa hanya boleh mengunduh dokumen miliknya sendiri!
      if (Number(doc.student_id) !== Number(student.id)) {
        return res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak mengunduh dokumen ini.' });
      }

      if (!doc.file_path || !fs.existsSync(doc.file_path)) {
        return res.status(404).json({ error: 'Berkas dokumen fisik tidak ditemukan di server.' });
      }

      // Dokumen berstatus revoked tetap diizinkan diunduh (arsip mahasiswa)
      const filename = `${doc.verification_id || 'transkrip'}${path.extname(doc.file_path) || '.pdf'}`;
      res.download(doc.file_path, filename);
    } catch (error) {
      console.error('Download Document Error:', error);
      res.status(500).json({ error: 'Gagal mengunduh dokumen transkrip nilai' });
    }
  }
};

module.exports = StudentPortalController;

