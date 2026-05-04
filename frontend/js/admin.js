document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin()) return;
  const user = getUser();
  if (user?.role !== 'admin') return window.location.href = roleRedirect(user);
  setText('adminName', user.name || 'Admin');
  await loadAdminPage();
});

async function loadAdminPage() {
  try {
    const [summary, elections, pending, activity] = await Promise.all([
      apiRequest('/dashboard/admin-summary'),
      apiRequest('/elections'),
      apiRequest('/candidates/pending'),
      apiRequest('/dashboard/activity')
    ]);
    setText('totalUsers', summary.total_users || 0);
    setText('totalElections', summary.total_elections || 0);
    setText('totalCandidates', summary.total_candidates || 0);
    setText('totalVotes', summary.total_votes || 0);
    renderElections(elections || []);
    renderPendingCandidates(pending || []);
    renderActivity(activity || []);
    fillElectionSelect('roleElectionId', elections || []);
    fillElectionSelect('resultElectionId', elections || []);
  } catch (err) { showMessage('adminMessage', err.message, 'error'); }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    active:  'background:#eaf3de;color:#3B6D11',
    draft:   'background:#faeeda;color:#854F0B',
    closed:  'background:#f1efe8;color:#5F5E5A',
    pending: 'background:#faeeda;color:#854F0B',
    approved:'background:#eaf3de;color:#3B6D11',
    rejected:'background:#fcebeb;color:#A32D2D',
  };
  const s = map[status] || 'background:var(--color-background-secondary);color:var(--color-text-secondary)';
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;padding:3px 9px;border-radius:20px;${s}">
    <span style="width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0"></span>
    ${escapeHtml(status)}
  </span>`;
}

function actionBtn(label, onclick, variant = 'default') {
  const styles = {
    default: 'background:var(--color-background-secondary);color:var(--color-text-primary);border:0.5px solid var(--color-border-secondary)',
    success: 'background:#eaf3de;color:#3B6D11;border:0.5px solid #C0DD97',
    danger:  'background:#fcebeb;color:#A32D2D;border:0.5px solid #F7C1C1',
    primary: 'background:#534AB7;color:#fff;border:none',
    outline: 'background:transparent;color:var(--color-text-secondary);border:0.5px solid var(--color-border-secondary)',
  };
  const s = styles[variant] || styles.default;
  return `<button onclick="${onclick}"
    style="height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:opacity .15s;${s}"
    onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
    ${label}
  </button>`;
}

function tdStyle(extra = '') {
  return `style="padding:12px 16px 12px 0;vertical-align:middle;font-size:13px;color:var(--color-text-primary);${extra}"`;
}

// ── render elections ──────────────────────────────────────────────────────────

function renderElections(elections) {
  const body = document.getElementById('electionsBody');
  if (!body) return;
  if (!elections.length) {
    body.innerHTML = `<tr><td colspan="6" style="padding:24px 0;text-align:center;font-size:13px;color:var(--color-text-secondary)">No elections created yet.</td></tr>`;
    return;
  }
  body.innerHTML = elections.map(e => `
    <tr style="border-bottom:0.5px solid var(--color-border-tertiary)">
      <td ${tdStyle()}>
        <span style="font-weight:500;color:var(--color-text-primary)">${escapeHtml(e.title)}</span>
        <br>
        <span style="font-size:12px;color:var(--color-text-secondary)">${escapeHtml(e.chapter_name || '')}${e.venue ? ' • ' + escapeHtml(e.venue) : ''}</span>
      </td>
      <td ${tdStyle('color:var(--color-text-secondary)')}>${formatDate(e.start_time)}</td>
      <td ${tdStyle('color:var(--color-text-secondary)')}>${formatDate(e.end_time)}</td>
      <td ${tdStyle()}>${statusBadge(e.status)}</td>
      <td ${tdStyle()}>
        <span style="font-size:12px;font-weight:500;color:${e.results_published ? '#3B6D11' : 'var(--color-text-secondary)'}">
          ${e.results_published ? '✓ Published' : 'Hidden'}
        </span>
      </td>
      <td ${tdStyle()}>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${actionBtn('Activate', `updateElectionStatus('${e.id}','active')`, 'success')}
          ${actionBtn('Close',    `updateElectionStatus('${e.id}','closed')`, 'outline')}
          ${actionBtn('Publish',  `publishResults('${e.id}')`,                'primary')}
        </div>
      </td>
    </tr>
  `).join('');
}

// ── render pending candidates ─────────────────────────────────────────────────

function renderPendingCandidates(list) {
  const body = document.getElementById('pendingBody');
  if (!body) return;
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="6" style="padding:24px 0;text-align:center;font-size:13px;color:var(--color-text-secondary)">No pending applications.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(c => {
    const initials = (c.users?.name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `
    <tr style="border-bottom:0.5px solid var(--color-border-tertiary)">
      <td ${tdStyle()}>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:#EEEDFE;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:#534AB7;flex-shrink:0">${initials}</div>
          <div>
            <span style="font-weight:500">${escapeHtml(c.users?.name || 'Candidate')}</span>
            <br>
            <span style="font-size:12px;color:var(--color-text-secondary)">${escapeHtml(c.users?.email || '')}</span>
          </div>
        </div>
      </td>
      <td ${tdStyle('color:var(--color-text-secondary)')}>${escapeHtml(c.elections?.title || '-')}</td>
      <td ${tdStyle('color:var(--color-text-secondary)')}>${escapeHtml(c.election_roles?.role_name || '-')}</td>
      <td ${tdStyle('max-width:200px')}>
        <span style="font-size:12px;color:var(--color-text-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(c.statement || '-')}</span>
        ${c.manifesto ? `<span style="font-size:11px;color:var(--color-text-secondary);display:block;margin-top:3px"><strong>Plan:</strong> ${escapeHtml(c.manifesto)}</span>` : ''}
      </td>
      <td ${tdStyle()}>${statusBadge('pending')}</td>
      <td ${tdStyle()}>
        <div style="display:flex;gap:6px">
          ${actionBtn('Approve', `reviewCandidate('${c.id}','approved')`, 'success')}
          ${actionBtn('Reject',  `reviewCandidate('${c.id}','rejected')`,  'danger')}
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

// ── render activity ───────────────────────────────────────────────────────────

function renderActivity(list) {
  const box = document.getElementById('activityList');
  if (!box) return;
  if (!list.length) {
    box.innerHTML = `<p style="font-size:13px;color:var(--color-text-secondary);padding:8px 0">No activity yet.</p>`;
    return;
  }
  box.innerHTML = list.map(a => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
      <div style="width:7px;height:7px;border-radius:50%;background:#534AB7;margin-top:5px;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <span style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${escapeHtml(a.action)}</span>
        ${a.details ? `<p style="font-size:12px;color:var(--color-text-secondary);margin:2px 0 0">${escapeHtml(a.details)}</p>` : ''}
        <span style="font-size:11px;color:var(--color-text-secondary)">${escapeHtml(a.users?.name || 'System')} • ${formatDate(a.created_at)}</span>
      </div>
    </div>
  `).join('');
}

// ── actions ───────────────────────────────────────────────────────────────────

async function updateElectionStatus(id, status) {
  try {
    await apiRequest(`/elections/${id}/status`, 'PATCH', { status });
    showMessage('adminMessage', `Election marked as ${status}`, 'success');
    await loadAdminPage();
  } catch (err) { showMessage('adminMessage', err.message, 'error'); }
}

async function publishResults(id) {
  if (!confirm('Publish results and close this election?')) return;
  try {
    await apiRequest(`/results/${id}/publish`, 'PATCH', {});
    showMessage('adminMessage', 'Results published', 'success');
    await loadAdminPage();
  } catch (err) { showMessage('adminMessage', err.message, 'error'); }
}

async function reviewCandidate(id, status) {
  try {
    await apiRequest(`/candidates/${id}/status`, 'PATCH', { status });
    showMessage('adminMessage', `Candidate ${status}`, 'success');
    await loadAdminPage();
  } catch (err) { showMessage('adminMessage', err.message, 'error'); }
}

// ── forms ─────────────────────────────────────────────────────────────────────

document.addEventListener('submit', async (e) => {
  if (e.target.id === 'electionForm') {
    e.preventDefault(); const f = e.target;
    try {
      await apiRequest('/elections', 'POST', {
        title:        f.title.value,
        description:  f.description.value,
        chapter_name: f.chapter_name.value,
        venue:        f.venue.value,
        start_time:   f.start_time.value,
        end_time:     f.end_time.value,
        status:       f.status.value
      });
      showMessage('adminMessage', 'Election created successfully', 'success');
      f.reset();
      if (f.chapter_name) f.chapter_name.value = 'NAU Campus Chapter';
      if (f.venue) f.venue.value = 'Online';
      await loadAdminPage();
    } catch (err) { showMessage('adminMessage', err.message, 'error'); }
  }

  if (e.target.id === 'roleForm') {
    e.preventDefault(); const f = e.target;
    try {
      await apiRequest('/roles', 'POST', {
        election_id:     f.election_id.value,
        role_name:       f.role_name.value,
        description:     f.description.value,
        responsibilities:f.responsibilities.value,
        eligibility:     f.eligibility.value,
        max_winners:     f.max_winners.value
      });
      showMessage('adminMessage', 'Role added successfully', 'success');
      f.reset();
      await loadAdminPage();
    } catch (err) { showMessage('adminMessage', err.message, 'error'); }
  }
});
