let currentElectionId = null;
let selectedByRole = {};

document.addEventListener('DOMContentLoaded', async()=>{
  if(!requireLogin()) return;
  const params=new URLSearchParams(location.search);
  currentElectionId=params.get('election');
  try{
    const elections=await apiRequest('/elections');
    const active=(elections || []).filter(e=>e.status==='active');
    fillElectionSelect('voteElectionSelect', active.length ? active : (elections || []));
    if(currentElectionId){ document.getElementById('voteElectionSelect').value=currentElectionId; await loadVotingPage(); }
  }catch(err){ showMessage('voteMessage',err.message,'error'); }
});

async function loadVotingPage(){
  currentElectionId=document.getElementById('voteElectionSelect')?.value;
  selectedByRole = {};
  if(!currentElectionId) return;
  try{
    const [election, roles, voteStatus] = await Promise.all([
      apiRequest(`/elections/${currentElectionId}`),
      apiRequest(`/roles/${currentElectionId}`),
      apiRequest(`/votes/status/${currentElectionId}`)
    ]);
    setText('voteTitle', election.title);
    setText('voteWindow', `${formatDate(election.start_time)} to ${formatDate(election.end_time)} • Status: ${election.status}`);
    const votedRoles = new Set((voteStatus || []).map(v=>v.role_id));
    renderVoteRoles(roles || [], votedRoles, election.status);
  }catch(err){ showMessage('voteMessage',err.message,'error'); }
}

async function renderVoteRoles(roles, votedRoles, electionStatus){
  const box=document.getElementById('voteRoles');
  box.innerHTML = roles.length ? '' : '<div class="empty">No roles added for this election.</div>';
  for(const role of roles){
    let candidates=[];
    try { candidates=await apiRequest(`/candidates/role/${role.id}`); } catch(err) { showMessage('voteMessage',err.message,'error'); }
    let candidateHtml='';
    if(!candidates.length) candidateHtml='<div class="empty">No approved candidates for this role yet.</div>';
    candidates.forEach(c=>{
      const name=escapeHtml(c.users?.name||'Candidate');
      const meta=`${escapeHtml(c.users?.college||'')} ${c.users?.department? '• '+escapeHtml(c.users.department):''}`;
      candidateHtml += `<label class="candidate-card" data-role="${role.id}" data-candidate="${c.id}" onclick="selectCandidate('${role.id}','${c.id}')">
        <input type="radio" name="role_${role.id}" ${votedRoles.has(role.id)||electionStatus!=='active'?'disabled':''}/>
        <b>${name}</b><span class="muted">${meta}</span><p>${escapeHtml(c.statement||'')}</p>${c.manifesto?`<small><b>Manifesto:</b> ${escapeHtml(c.manifesto)}</small>`:''}
      </label>`;
    });
    const disabled = votedRoles.has(role.id) || electionStatus !== 'active' || !candidates.length;
    if (electionStatus !== 'active') showMessage('voteMessage','This election is not active. Admin must activate it before votes can be submitted.','error');
    box.innerHTML += `<section class="card">
      <div class="pill-row"><span class="badge ${votedRoles.has(role.id)?'approved':'active'}">${votedRoles.has(role.id)?'Already voted':(electionStatus==='active'?'Open':'Not active')}</span></div>
      <h3>${escapeHtml(role.role_name)}</h3><p class="muted">${escapeHtml(role.description||'Select the candidate you support for this role.')}</p>
      <div class="grid grid-2">${candidateHtml}</div>
      <button class="btn btn-primary" ${disabled?'disabled':''} onclick="submitRoleVote('${role.id}')">Submit vote for ${escapeHtml(role.role_name)}</button>
    </section>`;
  }
}

function selectCandidate(roleId,candidateId){
  selectedByRole[roleId]=candidateId;
  document.querySelectorAll(`[data-role="${roleId}"]`).forEach(el=>el.classList.remove('selected'));
  const selected=document.querySelector(`[data-role="${roleId}"][data-candidate="${candidateId}"]`);
  if(selected){ selected.classList.add('selected'); const input=selected.querySelector('input'); if(input && !input.disabled) input.checked=true; }
}

async function submitRoleVote(roleId){
  const candidateId=selectedByRole[roleId];
  if(!candidateId) return showMessage('voteMessage','Please select a candidate first.','error');
  if(!confirm('Submit vote? You cannot change it later.')) return;
  try{
    await apiRequest('/votes','POST',{election_id:currentElectionId,role_id:roleId,candidate_id:candidateId});
    showMessage('voteMessage','Vote submitted successfully.','success');
    await loadVotingPage();
  }catch(err){ showMessage('voteMessage',err.message,'error'); }
}
