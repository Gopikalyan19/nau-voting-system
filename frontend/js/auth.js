document.addEventListener('DOMContentLoaded',()=>{
  const loginForm=document.getElementById('loginForm');
  const registerForm=document.getElementById('registerForm');

  if(loginForm){
    loginForm.addEventListener('submit',async(e)=>{
      e.preventDefault();
      try{
        const payload={ email:loginForm.email.value, password:loginForm.password.value };
        const data=await apiRequest('/auth/login','POST',payload);
        setSession(data.token,data.user);
        showMessage('message','Login successful. Redirecting...','success');
        setTimeout(()=>window.location.href=roleRedirect(data.user),600);
      }catch(err){ showMessage('message',err.message,'error'); }
    });
  }

  if(registerForm){
    registerForm.addEventListener('submit',async(e)=>{
      e.preventDefault();
      try{
        const payload={
          name:registerForm.name.value,
          email:registerForm.email.value,
          password:registerForm.password.value,
          role:registerForm.role.value,
          phone:registerForm.phone.value,
          college:registerForm.college.value,
          department:registerForm.department.value,
          year:registerForm.year.value
        };
        await apiRequest('/auth/register','POST',payload);
        showMessage('message','Registration successful. You can login now.','success');
        registerForm.reset();
      }catch(err){ showMessage('message',err.message,'error'); }
    });
  }
});
