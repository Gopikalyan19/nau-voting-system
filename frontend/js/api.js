const API_BASE_URL = 'https://nau-voting-system.onrender.com';

function getToken(){ return localStorage.getItem('token'); }
function getUser(){ try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } }
function setSession(token,user){ localStorage.setItem('token',token); localStorage.setItem('user',JSON.stringify(user)); }
function logout(){ localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='login.html'; }
function requireLogin(){ if(!getToken()){ window.location.href='login.html'; return false; } return true; }
function roleRedirect(user){ if(!user) return 'login.html'; if(user.role==='admin') return 'admin-dashboard.html'; if(user.role==='candidate') return 'candidate-dashboard.html'; return 'voter-dashboard.html'; }
function showMessage(id,message,type='info'){
  const el=document.getElementById(id); if(!el) return;
  el.className=`alert ${type}`;
  el.textContent=message;
  el.classList.remove('hidden','hide');
  setTimeout(()=>{ if(el) el.classList.add('hide'); }, 6000);
}
function setText(id,value){ const el=document.getElementById(id); if(el) el.textContent=value ?? ''; }
function formatDate(value){ if(!value) return '-'; const d=new Date(value); return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString(); }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }

async function apiRequest(endpoint, method='GET', body=null){
  const headers = {'Content-Type':'application/json'};
  const token = getToken();
  if(token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
  } catch (error) {
    throw new Error('Backend is not running. Start backend with: cd backend && npm run dev');
  }

  let data = {};
  try { data = await response.json(); } catch {}

  if(response.status === 401){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw new Error(data.error || 'Session expired. Please login again.');
  }
  if(!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function fillElectionSelect(selectId, elections){
  const select=document.getElementById(selectId); if(!select) return;
  select.innerHTML='<option value="">Select election</option>';
  (elections || []).forEach(e=>{
    const o=document.createElement('option');
    o.value=e.id;
    o.textContent=`${e.title} (${e.status})`;
    select.appendChild(o);
  });
}
