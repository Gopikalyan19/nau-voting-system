const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/admin-summary', authMiddleware, adminMiddleware, async (req, res) => {
  const [users, elections, candidates, votes, pending] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('elections').select('id', { count: 'exact', head: true }),
    supabase.from('candidates').select('id', { count: 'exact', head: true }),
    supabase.from('votes').select('id', { count: 'exact', head: true }),
    supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  const errors = [users, elections, candidates, votes, pending].filter(r => r.error).map(r => r.error.message);
  if (errors.length) return res.status(400).json({ error: errors.join(' | ') });

  res.json({
    total_users: users.count || 0,
    total_elections: elections.count || 0,
    total_candidates: candidates.count || 0,
    total_votes: votes.count || 0,
    pending_candidates: pending.count || 0
  });
});

router.get('/activity', authMiddleware, adminMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, users(name,email)')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

module.exports = router;
