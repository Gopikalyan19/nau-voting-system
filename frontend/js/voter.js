document.addEventListener('DOMContentLoaded', async()=>{
  if(!requireLogin()) return;
  const user=getUser();
  setText('voterName', user?.name || 'Member');
  await loadVoterDashboard();
});

async function loadVoterDashboard(){
  try{
    const elections=await apiRequest('/elections');
    const active=(elections || []).filter(e=>e.status==='active');
    renderVoterElections(active.length ? active : (elections || []));
    fillElectionSelect('voteElectionSelect', active.length ? active : (elections || []));
    fillElectionSelect('candidateElectionSelect', elections || []);
    await renderMyApplicationsIfCandidate();
  }catch(err){ showMessage('voterMessage',err.message,'error'); }
}

function renderVoterElections(elections){
  const box=document.getElementById('electionCards'); if(!box) return;
  box.innerHTML = elections.length ? '' : '<div class="empty">No elections available right now.</div>';
  elections.forEach(e=>{
    const votingDisabled = e.status !== 'active';
    box.innerHTML += `<div class="card">
      <div class="pill-row"><span class="badge ${escapeHtml(e.status)}">${escapeHtml(e.status)}</span>${e.results_published?'<span class="badge approved">results published</span>':''}</div>
      <h3>${escapeHtml(e.title)}</h3>
      <p class="muted">${escapeHtml(e.description||'No description added.')}</p>
      <p><b>Chapter:</b> ${escapeHtml(e.chapter_name||'-')}<br><b>Venue:</b> ${escapeHtml(e.venue||'-')}<br><b>Start:</b> ${formatDate(e.start_time)}<br><b>End:</b> ${formatDate(e.end_time)}</p>
      <div class="pill-row">
        <a class="btn ${votingDisabled ? 'btn-outline' : 'btn-primary'}" href="vote.html?election=${e.id}">${votingDisabled ? 'View Voting' : 'Open Voting'}</a>
        <a class="btn btn-outline" href="results.html?election=${e.id}">View Results</a>
      </div>
    </div>`;
  });
}

async function renderMyApplicationsIfCandidate(){
  const user=getUser();
  if(user?.role !== 'candidate') return;
  const box=document.getElementById('electionCards');
  if(!box) return;
  try{
    const apps=await apiRequest('/candidates/my-applications');
    if(!apps.length) return;
    box.innerHTML += `<div class="card"><h3>My Applications</h3><div class="list">${apps.map(a=>`<div class="list-item"><b>${escapeHtml(a.election_roles?.role_name || 'Role')}</b><p class="muted">${escapeHtml(a.elections?.title || '')}</p><span class="badge ${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></div>`).join('')}</div></div>`;
  }catch(err){ /* keep dashboard usable */ }
}

async function loadRolesForApply(){
  const id=document.getElementById('candidateElectionSelect')?.value;
  const select=document.getElementById('candidateRoleSelect');
  if(!select) return;
  select.innerHTML='<option value="">Select election first</option>';
  if(!id) return;
  try{
    const roles=await apiRequest(`/roles/${id}`);
    select.innerHTML='<option value="">Select role</option>';
    (roles || []).forEach(r=>{ const o=document.createElement('option'); o.value=r.id; o.textContent=r.role_name; select.appendChild(o); });
    if(!roles.length) select.innerHTML='<option value="">No roles added yet</option>';
  }catch(err){ showMessage('voterMessage',err.message,'error'); }
}

document.addEventListener('change', e=>{ if(e.target.id==='candidateElectionSelect') loadRolesForApply(); });

document.addEventListener('submit', async(e)=>{
  if(e.target.id==='candidateApplyForm'){
    e.preventDefault(); const f=e.target;
    try{
      await apiRequest('/candidates/apply','POST',{
        election_id:f.election_id.value,
        role_id:f.role_id.value,
        statement:f.statement.value,
        manifesto:f.manifesto.value,
        experience:f.experience.value
      });
      showMessage('voterMessage','Candidate application submitted for admin review','success');
      f.reset();
      const roleSelect=document.getElementById('candidateRoleSelect');
      if(roleSelect) roleSelect.innerHTML='<option value="">Select election first</option>';
      await loadVoterDashboard();
    }catch(err){ showMessage('voterMessage',err.message,'error'); }
  }
});
