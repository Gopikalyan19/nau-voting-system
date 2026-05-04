let currentElectionId = null;
let selectedByRole = {};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;
  const params = new URLSearchParams(location.search);
  currentElectionId = params.get('election');
  try {
    const elections = await apiRequest('/elections');
    const active = (elections || []).filter(e => e.status === 'active');
    fillElectionSelect('voteElectionSelect', active.length ? active : (elections || []));
    if (currentElectionId) {
      document.getElementById('voteElectionSelect').value = currentElectionId;
      await loadVotingPage();
    }
  } catch (err) { showMessage('voteMessage', err.message, 'error'); }
});

async function loadVotingPage() {
  currentElectionId = document.getElementById('voteElectionSelect')?.value;
  selectedByRole = {};
  if (!currentElectionId) return;
  try {
    const [election, roles, voteStatus] = await Promise.all([
      apiRequest(`/elections/${currentElectionId}`),
      apiRequest(`/roles/${currentElectionId}`),
      apiRequest(`/votes/status/${currentElectionId}`)
    ]);
    setText('voteTitle', election.title);
    const statusColor = election.status === 'active'
      ? 'bg-green-50 text-green-700'
      : election.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700';
    document.getElementById('voteWindow').innerHTML = `
      <div class="flex flex-wrap items-center gap-2 mt-1">
        <span class="inline-flex items-center gap-1 text-xs text-gray-500">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          ${formatDate(election.start_time)}
        </span>
        <span class="text-gray-300 text-xs">→</span>
        <span class="inline-flex items-center gap-1 text-xs text-gray-500">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          ${formatDate(election.end_time)}
        </span>
        <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}">
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          ${election.status}
        </span>
      </div>`;
    const votedRoles = new Set((voteStatus || []).map(v => v.role_id));
    renderVoteRoles(roles || [], votedRoles, election.status);
  } catch (err) { showMessage('voteMessage', err.message, 'error'); }
}

async function renderVoteRoles(roles, votedRoles, electionStatus) {
  const box = document.getElementById('voteRoles');
  box.innerHTML = roles.length ? '' : '<p class="text-sm text-gray-400 col-span-2 py-6 text-center">No roles added for this election.</p>';

  for (const role of roles) {
    let candidates = [];
    try { candidates = await apiRequest(`/candidates/role/${role.id}`); }
    catch (err) { showMessage('voteMessage', err.message, 'error'); }

    const isVoted = votedRoles.has(role.id);
    const isActive = electionStatus === 'active';
    const disabled = isVoted || !isActive || !candidates.length;

    if (!isActive) showMessage('voteMessage', 'This election is not active. Admin must activate it before votes can be submitted.', 'error');

    // Badge
    let badgeClass, badgeText;
    if (isVoted) {
      badgeClass = 'bg-blue-50 text-blue-600';
      badgeText = 'Already voted';
    } else if (isActive) {
      badgeClass = 'bg-green-50 text-green-700';
      badgeText = 'Open';
    } else {
      badgeClass = 'bg-amber-50 text-amber-700';
      badgeText = 'Not active';
    }

    // Candidates
    let candidateHtml = '';
    if (!candidates.length) {
      candidateHtml = '<p class="text-sm text-gray-400 col-span-2 py-2">No approved candidates for this role yet.</p>';
    }
    candidates.forEach(c => {
      const name = escapeHtml(c.users?.name || 'Candidate');
      const college = escapeHtml(c.users?.college || '');
      const dept = c.users?.department ? ' • ' + escapeHtml(c.users.department) : '';
      const meta = college + dept;
      const statement = escapeHtml(c.statement || '');
      const manifesto = c.manifesto
        ? `<p class="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100"><span class="font-semibold">Manifesto:</span> ${escapeHtml(c.manifesto)}</p>`
        : '';
      const initials = (c.users?.name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const disabledAttr = (isVoted || !isActive) ? 'disabled' : '';
      const cardOpacity = (isVoted || !isActive) ? 'opacity-60 cursor-default' : 'cursor-pointer hover:border-indigo-400 hover:bg-white';

      candidateHtml += `
        <label class="candidate-card relative flex flex-col gap-1 bg-gray-50 border-2 border-gray-200 rounded-xl p-4 transition-all ${cardOpacity}"
          data-role="${role.id}" data-candidate="${c.id}"
          onclick="selectCandidate('${role.id}','${c.id}')">
          <input type="radio" name="role_${role.id}" ${disabledAttr}
            class="absolute top-3 right-3 accent-indigo-600" />
          <div class="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-semibold text-indigo-600 mb-1 flex-shrink-0">
            ${initials}
          </div>
          <span class="text-sm font-semibold text-gray-900">${name}</span>
          <span class="text-xs text-gray-400">${meta}</span>
          ${statement ? `<p class="text-xs text-gray-500 mt-1 leading-relaxed">${statement}</p>` : ''}
          ${manifesto}
        </label>`;
    });

    // Submit button
    const btnClass = disabled
      ? 'w-full h-10 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2'
      : 'w-full h-10 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2';

    box.innerHTML += `
      <section class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${badgeClass}">
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            ${badgeText}
          </span>
        </div>
        <h3 class="text-base font-semibold text-gray-900 mb-1">${escapeHtml(role.role_name)}</h3>
        <p class="text-sm text-gray-400 mb-4">${escapeHtml(role.description || 'Select the candidate you support for this role.')}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">${candidateHtml}</div>
        <button class="${btnClass}" ${disabled ? 'disabled' : ''} onclick="submitRoleVote('${role.id}')">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Submit vote for ${escapeHtml(role.role_name)}
        </button>
      </section>`;
  }
}

function selectCandidate(roleId, candidateId) {
  selectedByRole[roleId] = candidateId;
  document.querySelectorAll(`[data-role="${roleId}"]`).forEach(el => {
    el.classList.remove('border-indigo-500', 'bg-indigo-50');
    el.classList.add('border-gray-200', 'bg-gray-50');
  });
  const selected = document.querySelector(`[data-role="${roleId}"][data-candidate="${candidateId}"]`);
  if (selected) {
    selected.classList.remove('border-gray-200', 'bg-gray-50');
    selected.classList.add('border-indigo-500', 'bg-indigo-50');
    const input = selected.querySelector('input');
    if (input && !input.disabled) input.checked = true;
  }
}

async function submitRoleVote(roleId) {
  const candidateId = selectedByRole[roleId];
  if (!candidateId) return showMessage('voteMessage', 'Please select a candidate first.', 'error');
  if (!confirm('Submit vote? You cannot change it later.')) return;
  try {
    await apiRequest('/votes', 'POST', { election_id: currentElectionId, role_id: roleId, candidate_id: candidateId });
    showMessage('voteMessage', 'Vote submitted successfully.', 'success');
    await loadVotingPage();
  } catch (err) { showMessage('voteMessage', err.message, 'error'); }
}
