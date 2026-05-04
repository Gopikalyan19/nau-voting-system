document.addEventListener('DOMContentLoaded', async()=>{
  if(!requireLogin()) return;
  const params=new URLSearchParams(location.search);
  const electionId=params.get('election');
  try{
    const elections=await apiRequest('/elections');
    fillElectionSelect('resultElectionSelect', elections || []);
    if(electionId){ document.getElementById('resultElectionSelect').value=electionId; await loadResults(electionId); }
  }catch(err){ showMessage('resultMessage',err.message,'error'); }
});

async function loadSelectedResults(){ const id=document.getElementById('resultElectionSelect').value; if(id) await loadResults(id); }
async function loadResults(electionId){
  try{
    const results=await apiRequest(`/results/${electionId}`);
    const body=document.getElementById('resultsBody'); const chart=document.getElementById('resultCards');
    body.innerHTML = results.length ? '' : '<tr><td colspan="4">No votes recorded yet or results hidden.</td></tr>';
    chart.innerHTML = results.length ? '' : '<div class="empty">No result data available.</div>';
    const max=Math.max(1,...results.map(r=>r.total_votes));
    results.forEach(r=>{
      const pct=Math.round((r.total_votes/max)*100);
      body.innerHTML += `<tr><td>${escapeHtml(r.role_name)}</td><td><b>${escapeHtml(r.candidate_name)}</b><br><span class="muted">${escapeHtml(r.statement||'')}</span></td><td>${r.total_votes}</td><td><div class="progress"><span style="width:${pct}%"></span></div></td></tr>`;
      chart.innerHTML += `<div class="list-item"><b>${escapeHtml(r.role_name)}</b><h3>${escapeHtml(r.candidate_name)}</h3><p class="muted">${r.total_votes} votes</p><div class="progress"><span style="width:${pct}%"></span></div></div>`;
    });
  }catch(err){ showMessage('resultMessage',err.message,'error'); }
}
