const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { requiredFields, cleanText } = require('../utils/validators');

const router = express.Router();

async function logActivity(userId, action, details) {
  await supabase.from('activity_logs').insert([{ user_id: userId || null, action, details }]);
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

router.get('/', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Election not found' });
  res.json(data);
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const missing = requiredFields(req.body, ['title', 'start_time', 'end_time']);
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    const startTime = normalizeDate(req.body.start_time);
    const endTime = normalizeDate(req.body.end_time);

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Please select valid start time and end time' });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const allowedStatus = ['draft', 'active', 'closed', 'cancelled'];
    const status = allowedStatus.includes(req.body.status) ? req.body.status : 'draft';

    const payload = {
      title: cleanText(req.body.title),
      description: cleanText(req.body.description || ''),
      chapter_name: cleanText(req.body.chapter_name || 'NAU Campus Chapter'),
      venue: cleanText(req.body.venue || 'Online'),
      start_time: startTime,
      end_time: endTime,
      status,
      results_published: false,
      created_by: req.user.id
    };

    const { data, error } = await supabase
      .from('elections')
      .insert([payload])
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity(req.user.id, 'ELECTION_CREATED', `Election created: ${data.title}`);
    res.status(201).json({ message: 'Election created successfully', election: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating election' });
  }
});

router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allowed = ['draft', 'active', 'closed', 'cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });

    const updatePayload = { status: req.body.status };
    if (req.body.status !== 'closed') updatePayload.results_published = false;

    const { data, error } = await supabase
      .from('elections')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity(req.user.id, 'ELECTION_STATUS_UPDATED', `${data.title} changed to ${data.status}`);
    res.json({ message: 'Election status updated', election: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while updating election status' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { error } = await supabase.from('elections').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  await logActivity(req.user.id, 'ELECTION_DELETED', `Election deleted: ${req.params.id}`);
  res.json({ message: 'Election deleted successfully' });
});

module.exports = router;
