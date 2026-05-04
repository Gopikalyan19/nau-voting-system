const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

async function logActivity(userId, action, details) {
  await supabase.from('activity_logs').insert([{ user_id: userId || null, action, details }]);
}

router.get('/:electionId', authMiddleware, async (req, res) => {
  try {
    const { electionId } = req.params;

    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id,title,results_published,status')
      .eq('id', electionId)
      .single();

    if (electionError || !election) return res.status(404).json({ error: 'Election not found' });

    // Admin can preview results anytime. Voters/candidates can see results only after publishing.
    if (!election.results_published && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Results are not published yet. Please wait for admin announcement.' });
    }

    // Fetch approved candidates first so the result page also shows candidates with 0 votes.
    const { data: candidates, error: candidateError } = await supabase
      .from('candidates')
      .select('id, election_id, role_id, statement, manifesto, status, users(name,email,college,department,year), election_roles(role_name)')
      .eq('election_id', electionId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (candidateError) return res.status(400).json({ error: candidateError.message });

    const { data: votes, error: voteError } = await supabase
      .from('votes')
      .select('candidate_id, role_id')
      .eq('election_id', electionId);

    if (voteError) return res.status(400).json({ error: voteError.message });

    const voteCounts = {};
    (votes || []).forEach(v => {
      voteCounts[v.candidate_id] = (voteCounts[v.candidate_id] || 0) + 1;
    });

    const results = (candidates || []).map(c => ({
      role_id: c.role_id,
      role_name: c.election_roles?.role_name || 'Role',
      candidate_id: c.id,
      candidate_name: c.users?.name || 'Candidate',
      candidate_email: c.users?.email || '',
      college: c.users?.college || '',
      department: c.users?.department || '',
      year: c.users?.year || '',
      statement: c.statement || '',
      manifesto: c.manifesto || '',
      total_votes: voteCounts[c.id] || 0
    })).sort((a, b) =>
      a.role_name.localeCompare(b.role_name) || b.total_votes - a.total_votes || a.candidate_name.localeCompare(b.candidate_name)
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Server error while loading results' });
  }
});

router.patch('/:electionId/publish', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id,title')
      .eq('id', req.params.electionId)
      .single();

    if (electionError || !election) return res.status(404).json({ error: 'Election not found' });

    const { data, error } = await supabase
      .from('elections')
      .update({ results_published: true, status: 'closed' })
      .eq('id', req.params.electionId)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    await logActivity(req.user.id, 'RESULTS_PUBLISHED', `Results published for ${data.title}`);
    res.json({ message: 'Results published successfully', election: data });
  } catch (error) {
    res.status(500).json({ error: 'Server error while publishing results' });
  }
});

module.exports = router;
