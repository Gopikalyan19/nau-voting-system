const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { requiredFields, isValidEmail, cleanText } = require('../utils/validators');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const allowedRoles = ['admin', 'voter', 'candidate'];

router.post('/register', async (req, res) => {
  try {
    const missing = requiredFields(req.body, ['name', 'email', 'password']);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email).toLowerCase();
    const password = req.body.password;
    const role = allowedRoles.includes(req.body.role) ? req.body.role : 'voter';
    const phone = cleanText(req.body.phone || '');
    const college = cleanText(req.body.college || '');
    const department = cleanText(req.body.department || '');
    const year = cleanText(req.body.year || '');

    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const passwordHash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{ name, email, password_hash: passwordHash, role, phone, college, department, year }]).select('id,name,email,role,phone,college,department,year,created_at').single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: 'User registered successfully', user: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const missing = requiredFields(req.body, ['email', 'password']);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    const email = cleanText(req.body.email).toLowerCase();
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(req.body.password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, college: user.college, department: user.department, year: user.year }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('users').select('id,name,email,role,phone,college,department,year,created_at').eq('id', req.user.id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

module.exports = router;
