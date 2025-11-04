document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('usuario').value;
  const clave = document.getElementById('clave').value;

  const { data, error } = await supabase.rpc('login_usuario', {
    usuario_input: usuario,
    clave_input: clave
  });

  if (error || !data || data.length === 0) {
    document.getElementById('error-msg').textContent = 'Credenciales inválidas o acceso denegado.';
    return;
  }

  const { id, rol } = data[0];
  localStorage.setItem('usuario_id', id);
  localStorage.setItem('rol', rol);

  window.location.href = '/dashboard.html';
});
