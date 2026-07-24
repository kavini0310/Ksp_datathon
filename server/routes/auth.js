const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ksp-intel-secure-secret-key-2026';

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token is invalid or expired' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is missing' });
  }
};

// Middleware to restrict access based on Role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

// Login Route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.findOne('users', u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, district: user.district, station: user.station },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  db.logAction(user.username, user.role, 'USER_LOGIN', req.ip, `User logged in successfully`);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      district: user.district,
      station: user.station,
      phone: user.phone,
      email: user.email
    }
  });
});

// Get profile
router.get('/profile', authenticateJWT, (req, res) => {
  const user = db.findOne('users', u => u.id === req.user.id);
  if (!user) {
    return res.status(444).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    district: user.district,
    station: user.station,
    phone: user.phone,
    email: user.email
  });
});

// Update profile
router.put('/profile', authenticateJWT, async (req, res) => {
  const { name, email, phone, password } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (phone) updates.phone = phone;
  if (password) {
    updates.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = db.update('users', req.user.id, updates);
  if (!updatedUser) {
    return res.status(404).json({ error: 'Failed to update profile' });
  }

  db.logAction(req.user.username, req.user.role, 'USER_PROFILE_UPDATE', req.ip, `Updated profile details`);
  res.json({ message: 'Profile updated successfully', user: {
    id: updatedUser.id,
    username: updatedUser.username,
    role: updatedUser.role,
    name: updatedUser.name,
    district: updatedUser.district,
    station: updatedUser.station,
    phone: updatedUser.phone,
    email: updatedUser.email
  }});
});

// Forgot Password / Reset Sim
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.findOne('users', u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'No user registered with this email address' });
  }
  
  // Return simulation token
  res.json({ message: 'Password reset instructions sent to registered contact.' });
});

module.exports = { router, authenticateJWT, requireRole };
