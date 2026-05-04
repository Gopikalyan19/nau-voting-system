document.addEventListener('DOMContentLoaded', async()=>{
  if(!requireLogin()) return;
  const user=getUser();
  if(user?.role!=='admin') return window.location.href=roleRedirect(user);
  setText('adminName', user.name || 'Admin');
  await loadAdminPage();
});

async function loadAdminPage(){
  try{
    const [summary,elections,pending,activity]=await Promise.all([
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
  }catch(err){ showMessage('adminMessage', err.message, 'error'); }
}

function renderElections(elections){
  const body=document.getElementById('electionsBody'); if(!body) return;
  body.innerHTML = elections.length ? '' : '<tr><td colspan="6">No elections created yet.</td></tr>';
  elections.forEach(e=>{
    body.innerHTML += `<tr>
      <td><b>${escapeHtml(e.title)}</b><br><span class="muted">${escapeHtml(e.chapter_name||'')} ${e.venue ? '• '+escapeHtml(e.venue) : ''}</span></td>
      <td>${formatDate(e.start_time)}</td>
      <td>${formatDate(e.end_time)}</td>
      <td><span class="badge ${escapeHtml(e.status)}">${escapeHtml(e.status)}</span></td>
      <td>${e.results_published?'Published':'Hidden'}</td>
      <td class="pill-row">
        <button class="btn btn-light" onclick="updateElectionStatus('${e.id}','active')">Activate</button>
        <button class="btn btn-outline" onclick="updateElectionStatus('${e.id}','closed')">Close</button>
        <button class="btn btn-success" onclick="publishResults('${e.id}')">Publish</button>
      </td>
    </tr>`;
  });
}

function renderPendingCandidates(list){
  const body=document.getElementById('pendingBody'); if(!body) return;
  body.innerHTML = list.length ? '' : '<tr><td colspan="6">No pending applications.</td></tr>';
  list.forEach(c=>{
    body.innerHTML += `<tr>
      <td><b>${escapeHtml(c.users?.name||'Candidate')}</b><br><span class="muted">${escapeHtml(c.users?.email||'')}</span></td>
      <td>${escapeHtml(c.elections?.title||'-')}</td>
      <td>${escapeHtml(c.election_roles?.role_name||'-')}</td>
      <td>${escapeHtml(c.statement||'-')} ${c.manifesto ? `<br><small><b>Plan:</b> ${escapeHtml(c.manifesto)}</small>` : ''}</td>
      <td><span class="badge pending">pending</span></td>
      <td class="pill-row"><button class="btn btn-success" onclick="reviewCandidate('${c.id}','approved')">Approve</button><button class="btn btn-danger" onclick="reviewCandidate('${c.id}','rejected')">Reject</button></td>
    </tr>`;
  });
}

function renderActivity(list){
  const box=document.getElementById('activityList'); if(!box) return;
  box.innerHTML = list.length ? '' : '<div class="empty">No activity yet.</div>';
  list.forEach(a=>{
    box.innerHTML += `<div class="list-item"><b>${escapeHtml(a.action)}</b><p class="muted">${escapeHtml(a.details||'')}</p><small>${escapeHtml(a.users?.name||'System')} • ${formatDate(a.created_at)}</small></div>`;
  });
}

async function updateElectionStatus(id,status){
  try{
    await apiRequest(`/elections/${id}/status`,'PATCH',{status});
    showMessage('adminMessage',`Election marked as ${status}`,'success');
    await loadAdminPage();
  }catch(err){ showMessage('adminMessage',err.message,'error'); }
}
async function publishResults(id){
  if(!confirm('Publish results and close this election?')) return;
  try{
    await apiRequest(`/results/${id}/publish`,'PATCH',{});
    showMessage('adminMessage','Results published','success');
    await loadAdminPage();
  }catch(err){ showMessage('adminMessage',err.message,'error'); }
}
async function reviewCandidate(id,status){
  try{
    await apiRequest(`/candidates/${id}/status`,'PATCH',{status});
    showMessage('adminMessage',`Candidate ${status}`,'success');
    await loadAdminPage();
  }catch(err){ showMessage('adminMessage',err.message,'error'); }
}

document.addEventListener('submit', async(e)=>{
  if(e.target.id==='electionForm'){
    e.preventDefault(); const f=e.target;
    try{
      await apiRequest('/elections','POST',{
        title:f.title.value,
        description:f.description.value,
        chapter_name:f.chapter_name.value,
        venue:f.venue.value,
        start_time:f.start_time.value,
        end_time:f.end_time.value,
        status:f.status.value
      });
      showMessage('adminMessage','Election created successfully','success');
      f.reset();
      if(f.chapter_name) f.chapter_name.value='NAU Campus Chapter';
      if(f.venue) f.venue.value='Online';
      await loadAdminPage();
    }catch(err){ showMessage('adminMessage',err.message,'error'); }
  }
  if(e.target.id==='roleForm'){
    e.preventDefault(); const f=e.target;
    try{
      await apiRequest('/roles','POST',{
        election_id:f.election_id.value,
        role_name:f.role_name.value,
        description:f.description.value,
        responsibilities:f.responsibilities.value,
        eligibility:f.eligibility.value,
        max_winners:f.max_winners.value
      });
      showMessage('adminMessage','Role added successfully','success');
      f.reset();
      await loadAdminPage();
    }catch(err){ showMessage('adminMessage',err.message,'error'); }
  }
});
