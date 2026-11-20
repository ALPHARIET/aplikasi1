const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const UserModel = require('../models/userModel');
const StudentModel = require('../models/studentModel');
const { passwordProblem } = require('../utils/passwordPolicy');

// Hash pengganti untuk akun yang tidak ada. bcrypt tetap dijalankan supaya waktu respons
// "akun tidak ada" sama dengan "kata sandi salah" (mencegah enumerasi akun lewat waktu).
const DUMMY_HASH = bcrypt.hashSync('akun-tidak-ada', 10);

const AuthController = {
  // Register a new user (khusus Admin, lihat authRoutes)
  register: async (req, res) => {
    try {
      const { name, email, password, role = 'student' } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi' });
      }

      if (!['admin', 'student'].includes(role)) {
        return res.status(400).json({ error: "Role harus 'admin' atau 'student'" });
      }

      const weakPassword = passwordProblem(password);
      if (weakPassword) {
        return res.status(400).json({ error: weakPassword });
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email sudah terdaftar' });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const newUserId = await UserModel.create({
        name,
        email,
        passwordHash,
        role
      });

      res.status(201).json({
        message: 'Pengguna berhasil didaftarkan',
        userId: newUserId
      });
    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ error: 'Gagal mendaftarkan pengguna' });
    }
  },

  // Login (Mendukung Email untuk Admin & Mahasiswa, serta NIM untuk Mahasiswa)
  login: async (req, res) => {
    try {
      // role (opsional): peran yang dipilih di halaman login; kalau dikirim, harus sama dengan peran akun
      const { email, studentIdNumber, identifier, password, role: expectedRole } = req.body;
      const loginId = (identifier || studentIdNumber || email || '').trim();

      if (!loginId || !password) {
        return res.status(400).json({ error: 'Identitas masuk dan kata sandi wajib diisi' });
      }

      let user = null;
      let student = null;

      // Jika ada '@', cari berdasarkan email; jika tidak, cari berdasarkan NIM mahasiswa
      if (loginId.includes('@')) {
        user = await UserModel.findByEmail(loginId);
        if (user && user.role === 'student') {
          student = await StudentModel.getByUserId(user.id);
        }
      } else {
        user = await UserModel.findByNIM(loginId);
        if (user) {
          student = {
            id: user.student_id,
            student_id_number: user.student_id_number,
            full_name: user.full_name,
            faculty: user.faculty,
            program: user.program,
            graduation_year: user.graduation_year
          };
        }
      }

      // Pesan dan waktu respons sama untuk akun yang tidak ada dan sandi salah,
      // jadi tidak membocorkan apakah identitas terdaftar
      const isMatch = await bcrypt.compare(String(password), user ? user.password_hash : DUMMY_HASH);
      if (!user || !isMatch) {
        return res.status(401).json({ error: 'NIM/email atau kata sandi salah' });
      }

      // Dicek setelah kata sandi benar, jadi peran akun tidak bocor ke orang yang tidak tahu sandinya
      if (expectedRole !== undefined && !['admin', 'student'].includes(expectedRole)) {
        return res.status(400).json({ error: 'Peran tidak valid' });
      }
      if (expectedRole && expectedRole !== user.role) {
        return res.status(403).json({
          error: user.role === 'admin'
            ? 'Ini akun administrator, bukan akun mahasiswa.'
            : 'Ini akun mahasiswa, bukan akun administrator.',
          code: 'ROLE_MISMATCH',
          actualRole: user.role
        });
      }

      // Generate JWT Token
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        sub: student ? student.id : user.id,
        studentId: student ? student.id : null
      };

      const token = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({
        message: 'Login berhasil',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student: student || null
        }
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Gagal memproses proses masuk' });
    }
  },

  // Dedicated Student Login (Khusus Mahasiswa dengan NIM & Password)
  studentLogin: async (req, res) => {
    try {
      const { studentIdNumber, password } = req.body;
      const nim = (studentIdNumber || '').trim();

      if (!nim || !password) {
        return res.status(400).json({ error: 'NIM dan kata sandi wajib diisi' });
      }

      const found = await UserModel.findByNIM(nim);
      const user = found && found.role === 'student' ? found : null;
      const isMatch = await bcrypt.compare(String(password), user ? user.password_hash : DUMMY_HASH);
      if (!user || !isMatch) {
        return res.status(401).json({ error: 'NIM atau kata sandi salah' });
      }

      const student = {
        id: user.student_id,
        student_id_number: user.student_id_number,
        full_name: user.full_name,
        faculty: user.faculty,
        program: user.program,
        graduation_year: user.graduation_year
      };

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        sub: student.id,
        studentId: student.id
      };

      const token = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({
        message: 'Login berhasil',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student
        }
      });
    } catch (error) {
      console.error('Student Login Error:', error);
      res.status(500).json({ error: 'Gagal memproses masuk mahasiswa' });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }

      let student = null;
      if (user.role === 'student') {
        student = await StudentModel.getByUserId(user.id);
      }

      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student: student || null
        }
      });
    } catch (error) {
      console.error('Get Profile Error:', error);
      res.status(500).json({ error: 'Gagal mengambil data profil' });
    }
  }
};

module.exports = AuthController;
