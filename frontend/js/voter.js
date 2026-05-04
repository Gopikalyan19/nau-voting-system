document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;
  const user = getUser();
  setText('voterName', user?.name || 'Member');
  await loadVoterDashboard();
});

async function loadVoterDashboard() {
  try {
    const elections = await apiRequest('/elections');
    const active = (elections || []).filter(e => e.status === 'active');
    renderVoterElections(active.length ? active : (elections || []));
    fillElectionSelect('voteElectionSelect', active.length ? active : (elections || []));
    await renderMyApplicationsIfCandidate();
  } catch (err) { showMessage('voterMessage', err.message, 'error'); }
}

function statusBadge(status) {
  const map = {
    active:   'bg-green-50 text-green-700',
    draft:    'bg-amber-50 text-amber-700',
    closed:   'bg-gray-100 text-gray-500',
    pending:  'bg-amber-50 text-amber-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-500';
  return `<span class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${cls}">
    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
    ${escapeHtml(status)}
  </span>`;
}

function renderVoterElections(elections) {
  const box = document.getElementById('electionCards');
  if (!box) return;

  if (!elections.length) {
    box.innerHTML = `<p class="text-sm text-gray-400 col-span-2 py-4 text-center">No elections available right now.</p>`;
    return;
  }

  box.innerHTML = elections.map(e => {
    const votingDisabled = e.status !== 'active';
    const voteBtn = votingDisabled
      ? `<a href="vote.html?election=${e.id}" class="h-9 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center">View Voting</a>`
      : `<a href="vote.html?election=${e.id}" class="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium text-white transition-colors inline-flex items-center">Open Voting</a>`;

    return `
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          ${statusBadge(e.status)}
          ${e.results_published ? statusBadge('approved').replace(escapeHtml('approved'), 'Results Published') : ''}
        </div>
        <div>
          <h3 class="text-base font-semibold text-gray-900 mb-1">${escapeHtml(e.title)}</h3>
          <p class="text-sm text-gray-400 leading-relaxed">${escapeHtml(e.description || 'No description added.')}</p>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
          <div><span class="font-medium text-gray-700">Chapter</span><br>${escapeHtml(e.chapter_name || '-')}</div>
          <div><span class="font-medium text-gray-700">Venue</span><br>${escapeHtml(e.venue || '-')}</div>
          <div class="mt-1"><span class="font-medium text-gray-700">Start</span><br>${formatDate(e.start_time)}</div>
          <div class="mt-1"><span class="font-medium text-gray-700">End</span><br>${formatDate(e.end_time)}</div>
        </div>
       
      </div>`;
  }).join('');
}

async function renderMyApplicationsIfCandidate() {
  const user = getUser();
  if (user?.role !== 'candidate') return;
  const box = document.getElementById('electionCards');
  if (!box) return;
  try {
    const apps = await apiRequest('/candidates/my-applications');
    if (!apps.length) return;

    const appItems = apps.map(a => `
      <div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
        <div>
          <p class="text-sm font-medium text-gray-900">${escapeHtml(a.election_roles?.role_name || 'Role')}</p>
          <p class="text-xs text-gray-400">${escapeHtml(a.elections?.title || '')}</p>
        </div>
        ${statusBadge(a.status)}
      </div>`).join('');

    box.innerHTML += `
      <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
        <h3 class="text-base font-semibold text-gray-900">My Applications</h3>
        <div class="divide-y divide-gray-100">${appItems}</div>
      </div>`;
  } catch (err) { /* keep dashboard usable */ }
}
