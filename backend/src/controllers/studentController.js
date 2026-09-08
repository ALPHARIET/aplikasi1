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

      // 1. Create User account first
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      const userId = await UserModel.create({
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

      res.status(201).json({ 
        message: 'Student created successfully',
        studentId,
        userId
      });

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
  }
};

module.exports = StudentController;
