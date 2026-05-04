const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { requiredFields, cleanText } = require('../utils/validators');

const router = express.Router();

async function logActivity(userId, action, details) {
  await supabase.from('activity_logs').insert([{ user_id: userId || null, action, details }]);
}

router.get('/:electionId', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('election_roles')
    .select('*')
    .eq('election_id', req.params.electionId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const missing = requiredFields(req.body, ['election_id', 'role_name']);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    const maxWinners = Number(req.body.max_winners || 1);
    if (!Number.isInteger(maxWinners) || maxWinners < 1) {
      return res.status(400).json({ error: 'Max winners must be at least 1' });
    }

    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id,title')
      .eq('id', req.body.election_id)
      .single();

    if (electionError || !election) return res.status(404).json({ error: 'Election not found' });

    const payload = {
      election_id: req.body.election_id,
      role_name: cleanText(req.body.role_name),
      description: cleanText(req.body.description || ''),
      responsibilities: cleanText(req.body.responsibilities || ''),
      eligibility: cleanText(req.body.eligibility || ''),
      max_winners: maxWinners
    };

    const { data, error } = await supabase
      .from('election_roles')
      .insert([payload])
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity(req.user.id, 'ROLE_ADDED', `Role ${data.role_name} added to ${election.title}`);
    res.status(201).json({ message: 'Role added successfully', role: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while adding role' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { error } = await supabase.from('election_roles').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  await logActivity(req.user.id, 'ROLE_DELETED', `Role deleted: ${req.params.id}`);
  res.json({ message: 'Role deleted successfully' });
});

module.exports = router;
