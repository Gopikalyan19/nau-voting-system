document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;
  const params = new URLSearchParams(location.search);
  const electionId = params.get('election');
  try {
    const elections = await apiRequest('/elections');
    fillElectionSelect('resultElectionSelect', elections || []);
    if (electionId) {
      document.getElementById('resultElectionSelect').value = electionId;
      await loadResults(electionId);
    }
  } catch (err) { showMessage('resultMessage', err.message, 'error'); }
});

async function loadSelectedResults() {
  const id = document.getElementById('resultElectionSelect').value;
  if (id) await loadResults(id);
}

async function loadResults(electionId) {
  try {
    const results = await apiRequest(`/results/${electionId}`);
    const body  = document.getElementById('resultsBody');
    const cards = document.getElementById('resultCards');

    if (!results.length) {
      body.innerHTML  = `<tr><td colspan="4" class="py-6 text-sm text-gray-400 text-center">No votes recorded yet or results hidden.</td></tr>`;
      cards.innerHTML = `<p class="text-sm text-gray-400 col-span-2 py-4 text-center">No result data available.</p>`;
      return;
    }

    // Group by role to find winner per role
    const byRole = {};
    results.forEach(r => {
      if (!byRole[r.role_name]) byRole[r.role_name] = [];
      byRole[r.role_name].push(r);
    });

    const maxVotes = Math.max(1, ...results.map(r => r.total_votes));

    // ── Summary cards ──────────────────────────────────────────────────────────
    cards.innerHTML = '';
    Object.entries(byRole).forEach(([roleName, candidates]) => {
      const winner = candidates.reduce((a, b) => a.total_votes >= b.total_votes ? a : b);
      const totalForRole = candidates.reduce((sum, c) => sum + c.total_votes, 0);
      const winnerPct = totalForRole > 0 ? Math.round((winner.total_votes / totalForRole) * 100) : 0;
      const initials = (winner.candidate_name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

      cards.innerHTML += `
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">${escapeHtml(roleName)}</span>
            <span class="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
              <span class="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
              Winner
            </span>
          </div>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-semibold text-indigo-600 flex-shrink-0">
              ${initials}
            </div>
            <div>
              <p class="text-base font-semibold text-gray-900">${escapeHtml(winner.candidate_name)}</p>
              <p class="text-xs text-gray-400">${winner.total_votes} vote${winner.total_votes !== 1 ? 's' : ''} · ${winnerPct}% of role votes</p>
            </div>
          </div>
          <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 rounded-full transition-all" style="width:${winnerPct}%"></div>
          </div>
          ${candidates.length > 1 ? `
            <div class="mt-3 pt-3 border-t border-gray-100 space-y-1">
              ${candidates.filter(c => c.candidate_name !== winner.candidate_name).map(c => {
                const pct = totalForRole > 0 ? Math.round((c.total_votes / totalForRole) * 100) : 0;
                return `<div class="flex items-center justify-between text-xs text-gray-400">
                  <span>${escapeHtml(c.candidate_name)}</span>
                  <span>${c.total_votes} votes · ${pct}%</span>
                </div>`;
              }).join('')}
            </div>` : ''}
        </div>`;
    });

    // ── Detailed table ─────────────────────────────────────────────────────────
    body.innerHTML = '';
    results.forEach(r => {
      const pct = Math.round((r.total_votes / maxVotes) * 100);
      const initials = (r.candidate_name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

      body.innerHTML += `
        <tr class="border-b border-gray-50">
          <td class="py-3 pr-4">
            <span class="text-sm font-medium text-gray-700">${escapeHtml(r.role_name)}</span>
          </td>
          <td class="py-3 pr-4">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[11px] font-semibold text-indigo-600 flex-shrink-0">
                ${initials}
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">${escapeHtml(r.candidate_name)}</p>
                ${r.statement ? `<p class="text-xs text-gray-400 truncate max-w-[160px]">${escapeHtml(r.statement)}</p>` : ''}
              </div>
            </div>
          </td>
          <td class="py-3 pr-4">
            <span class="text-sm font-semibold text-gray-900">${r.total_votes}</span>
          </td>
          <td class="py-3 w-40">
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full" style="width:${pct}%"></div>
              </div>
              <span class="text-xs text-gray-400 w-8 text-right">${pct}%</span>
            </div>
          </td>
        </tr>`;
    });

  } catch (err) { showMessage('resultMessage', err.message, 'error'); }
}
