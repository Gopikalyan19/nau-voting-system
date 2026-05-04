const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { requiredFields, cleanText } = require('../utils/validators');

const router = express.Router();

async function logActivity(userId, action, details) {
  await supabase.from('activity_logs').insert([{ user_id: userId || null, action, details }]);
}

router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const missing = requiredFields(req.body, ['election_id', 'role_id', 'statement']);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    const { data: role, error: roleError } = await supabase
      .from('election_roles')
      .select('id,role_name,election_id')
      .eq('id', req.body.role_id)
      .eq('election_id', req.body.election_id)
      .single();

    if (roleError || !role) return res.status(400).json({ error: 'Invalid election or role selected' });

    const payload = {
      user_id: req.user.id,
      election_id: req.body.election_id,
      role_id: req.body.role_id,
      statement: cleanText(req.body.statement),
      manifesto: cleanText(req.body.manifesto || ''),
      experience: cleanText(req.body.experience || ''),
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('candidates')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You have already applied for this role' });
      }
      return res.status(400).json({ error: error.message });
    }

    await logActivity(req.user.id, 'CANDIDATE_APPLIED', `Application submitted for ${role.role_name}`);
    res.status(201).json({ message: 'Candidate application submitted', candidate: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while submitting candidate application' });
  }
});

router.get('/my-applications', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*, elections(title,status,start_time,end_time), election_roles(role_name)')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

router.get('/pending', authMiddleware, adminMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*, users(name,email,phone,college,department,year), elections(title,status), election_roles(role_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

router.get('/role/:roleId', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, election_id, role_id, statement, manifesto, experience, status, users(name,email,college,department,year)')
    .eq('role_id', req.params.roleId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!['approved', 'rejected'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const { data, error } = await supabase
      .from('candidates')
      .update({ status: req.body.status, review_note: cleanText(req.body.review_note || '') })
      .eq('id', req.params.id)
      .select('*, users(name,email), election_roles(role_name)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity(req.user.id, 'CANDIDATE_REVIEWED', `${data.users?.name || 'Candidate'} ${req.body.status} for ${data.election_roles?.role_name || 'role'}`);
    res.json({ message: 'Candidate status updated', candidate: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while reviewing candidate' });
  }
});

module.exports = router;
