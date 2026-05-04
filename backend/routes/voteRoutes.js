const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

async function logActivity(userId, action, details) {
  await supabase.from('activity_logs').insert([{ user_id: userId || null, action, details }]);
}

router.get('/status/:electionId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('role_id, candidate_id, created_at, election_roles(role_name), candidates(users(name))')
      .eq('election_id', req.params.electionId)
      .eq('voter_id', req.user.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Server error while checking vote status' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { election_id, role_id, candidate_id } = req.body;
    const voter_id = req.user.id;

    if (!election_id || !role_id || !candidate_id) {
      return res.status(400).json({ error: 'Please select election, role and candidate before submitting vote.' });
    }

    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('*')
      .eq('id', election_id)
      .single();

    if (electionError || !election) return res.status(404).json({ error: 'Election not found' });
    if (election.status !== 'active') {
      return res.status(400).json({ error: 'Election is not active. Go to Admin Dashboard and click Activate for this election.' });
    }

    const now = new Date();
    const start = new Date(election.start_time);
    const end = new Date(election.end_time);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Election start or end time is invalid. Please recreate or update the election.' });
    }
    if (now < start) return res.status(400).json({ error: 'Voting has not started yet. Please check the election start time.' });
    if (now > end) return res.status(400).json({ error: 'Voting is closed because the election end time has passed.' });

    const { data: role, error: roleError } = await supabase
      .from('election_roles')
      .select('id,role_name,election_id')
      .eq('id', role_id)
      .eq('election_id', election_id)
      .single();

    if (roleError || !role) return res.status(400).json({ error: 'Invalid role for this election' });

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, user_id, role_id, election_id, status, users(name)')
      .eq('id', candidate_id)
      .eq('role_id', role_id)
      .eq('election_id', election_id)
      .eq('status', 'approved')
      .single();

    if (candidateError || !candidate) {
      return res.status(400).json({ error: 'Invalid candidate or candidate is not approved yet. Admin must approve candidates before voting.' });
    }

    const { data, error } = await supabase
      .from('votes')
      .insert([{ voter_id, election_id, role_id, candidate_id }])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'You have already voted for this role. One vote per role is allowed.' });
      return res.status(400).json({ error: error.message });
    }

    await logActivity(voter_id, 'VOTE_CAST', `Vote submitted for ${role.role_name}`);
    res.status(201).json({ message: 'Vote recorded successfully', vote: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while recording vote' });
  }
});

module.exports = router;
