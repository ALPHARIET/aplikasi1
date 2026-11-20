const bcrypt = require('bcrypt');
const fs = require('fs');
const StudentModel = require('../models/studentModel');
const UserModel = require('../models/userModel');
const DocumentModel = require('../models/documentModel');
const BlockchainService = require('../services/blockchainService');
const { resolveStoredPath } = require('../utils/uploadPath');
const { passwordProblem, randomPassword } = require('../utils/passwordPolicy');

const STUDENT_DELETED_REASON = 'Data mahasiswa dihapus oleh Administrator.';

// Cabut di blockchain semua dokumen mahasiswa yang masih aktif di sana. Dokumen yang tidak ada
// di blockchain (mis. setelah Hardhat node di-restart) atau sudah dicabut dilewati.
// Kalau satu pencabutan gagal, galatnya dilempar agar data mahasiswa tidak jadi dihapus.
async function revokeActiveDocuments(docs) {
  for (const doc of docs) {
    if (!(await BlockchainService.isDocumentValid(doc.verification_id))) continue;
    await BlockchainService.revokeDocument(doc.verification_id);
    await DocumentModel.updateRevokeStatus(doc.verification_id, STUDENT_DELETED_REASON);
  }
}

function deleteDocumentFiles(docs) {
  for (const doc of docs) {
    const fileOnDisk = resolveStoredPath(doc.file_path);
    try {
      if (fileOnDisk && fs.existsSync(fileOnDisk)) fs.unlinkSync(fileOnDisk);
    } catch (fileErr) {
      console.warn('Failed to delete physical file:', fileErr.message);
    }
  }
}

const StudentController = {
  // Get all students
  getAll: async (req, res) => {
    try {
      const students = await StudentModel.getAll();
      res.json({ students });
    } catch (error) {
      console.error('Get All Students Error:', error);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  },

  // Get student by ID
  getById: async (req, res) => {
    try {
      const student = await StudentModel.getById(req.params.id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json({ student });
    } catch (error) {
      console.error('Get Student Error:', error);
      res.status(500).json({ error: 'Failed to fetch student' });
    }
  },

  // Create new student (Admin only)
  create: async (req, res) => {
    try {
      const { 
        email, password, studentIdNumber, fullName, faculty, program, graduationYear 
      } = req.body;

      // Validate required fields
      if (!email || !password || !studentIdNumber || !fullName || !faculty) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const weakPassword = passwordProblem(password);
      if (weakPassword) {
        return res.status(400).json({ error: weakPassword });
      }

      // Check if email already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      // Check if NIM already exists
      const existingStudent = await StudentModel.getByStudentIdNumber(studentIdNumber);
      if (existingStudent) {
        return res.status(409).json({ error: 'Student ID Number (NIM/NIS) already exists' });
      }

      // 1. Create User account first
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      let userId;
      try {
        userId = await UserModel.create({
          name: fullName,
          email,
          passwordHash,
          role: 'student'
        });

        // 2. Create Student profile
        const studentId = await StudentModel.create({
          userId,
          studentIdNumber,
          fullName,
          faculty,
          program,
          graduationYear
        });

        return res.status(201).json({ 
          message: 'Student created successfully',
          studentId,
          userId
        });
      } catch (innerErr) {
        // Rollback user jika pembuatan student gagal
        if (userId) {
          try {
            await UserModel.delete?.(userId) || await require('../config/database').query('DELETE FROM users WHERE id = ?', [userId]);
          } catch (e) {
            console.error('Failed to rollback user:', e);
          }
        }
        throw innerErr;
      }

    } catch (error) {
      // Handle duplicate student_id_number error (MySQL error code ER_DUP_ENTRY)
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Student ID Number (NIM/NIS) already exists' });
      }
      console.error('Create Student Error:', error);
      res.status(500).json({ error: 'Failed to create student' });
    }
  },

  // Update student (Admin only)
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const { studentIdNumber, fullName, faculty, program, graduationYear } = req.body;

      const affectedRows = await StudentModel.update(id, {
        studentIdNumber, fullName, faculty, program, graduationYear
      });

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.json({ message: 'Student updated successfully' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Student ID Number (NIM/NIS) already exists' });
      }
      console.error('Update Student Error:', error);
      res.status(500).json({ error: 'Failed to update student' });
    }
  },

  // Delete student (Admin only)
  // Baris dokumen ikut terhapus lewat ON DELETE CASCADE, jadi transkrip yang masih aktif
  // dicabut dulu di blockchain dan berkasnya dihapus; kalau tidak, transkrip itu tetap
  // terbaca valid di blockchain padahal datanya sudah tidak ada.
  delete: async (req, res) => {
    try {
      const id = req.params.id;
      const student = await StudentModel.getById(id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const docs = await DocumentModel.getByStudentId(id);
      try {
        await revokeActiveDocuments(docs);
      } catch (revokeError) {
        console.error('Revoke On Student Delete Error:', revokeError);
        return res.status(500).json({
          error: 'Gagal mencabut transkrip mahasiswa ini di blockchain, jadi datanya tidak dihapus. Coba lagi.'
        });
      }

      const affectedRows = await StudentModel.delete(id);
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      deleteDocumentFiles(docs);

      res.json({ message: 'Student deleted successfully' });
    } catch (error) {
      console.error('Delete Student Error:', error);
      res.status(500).json({ error: 'Failed to delete student' });
    }
  },

  // Reset password mahasiswa oleh admin
  resetPassword: async (req, res) => {
    try {
      const id = req.params.id;
      let { newPassword } = req.body || {};

      if (newPassword === undefined || newPassword === null || newPassword === '') {
        // Tanpa kata sandi baru dari admin: buat kata sandi acak 10 karakter (crypto)
        newPassword = randomPassword();
      } else {
        const weakPassword = passwordProblem(newPassword);
        if (weakPassword) {
          return res.status(400).json({ error: weakPassword });
        }
      }

      const saltRounds = 10;
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      const success = await StudentModel.resetPassword(id, newHash);
      if (!success) {
        return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
      }

      res.json({
        message: 'Kata sandi mahasiswa berhasil direset',
        newPassword
      });
    } catch (error) {
      console.error('Reset Password Error:', error);
      res.status(500).json({ error: 'Gagal mereset kata sandi mahasiswa' });
    }
  }
};

module.exports = StudentController;
