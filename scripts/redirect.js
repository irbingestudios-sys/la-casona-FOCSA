const rol = localStorage.getItem('rol');

switch (rol) {
  case 'admin_menu':
    window.location.href = '/menus.html';
    break;
  case 'cocina':
    window.location.href = '/cocina.html';
    break;
  case 'reparto':
    window.location.href = '/reparto.html';
    break;
  case 'admin_general':
    window.location.href = '/admin-usuarios.html';
    break;
  default:
    document.body.innerHTML = '<h3>Acceso denegado</h3>';
}
