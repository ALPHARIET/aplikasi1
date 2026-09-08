const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const AuthController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Save user
      const newUserId = await UserModel.create({
        name,
        email,
        passwordHash,
        role: role || 'student'
      });

      res.status(201).json({
        message: 'User registered successfully',
        userId: newUserId
      });
    } catch (error) {
      console.error('Registration Error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({ user });
    } catch (error) {
      console.error('Get Profile Error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
};

module.exports = AuthController;
