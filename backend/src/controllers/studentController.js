const bcrypt = require('bcrypt');
const StudentModel = require('../models/studentModel');
const UserModel = require('../models/userModel');

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
  delete: async (req, res) => {
    try {
      const id = req.params.id;
      const affectedRows = await StudentModel.delete(id);
      
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

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

      if (!newPassword || newPassword.trim().length < 6) {
        // Jika tidak diberikan atau kurang dari 6 karakter, buat password acak 8 karakter
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        newPassword = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
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
