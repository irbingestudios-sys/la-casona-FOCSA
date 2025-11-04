// 🔗 [LOG:LOGIN-001] Conexión a Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

// 🧠 [LOG:LOGIN-002] Conectar botón al evento
document.getElementById("btn-login").addEventListener("click", iniciarSesion);

// 🔐 [LOG:LOGIN-003] Función principal de inicio de sesión
async function iniciarSesion() {
  const correo = document.getElementById("correo").value.trim();
  const clave = document.getElementById("clave").value.trim();
  const mensaje = document.getElementById("mensaje-error");

  mensaje.style.display = "none";

  if (!correo || !clave) {
    mensaje.textContent = "Debes ingresar correo y contraseña.";
    mensaje.style.display = "block";
    console.warn("[LOGIN-WARN] Campos vacíos");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: clave
    });

    if (error || !data?.user) {
      mensaje.textContent = "Credenciales incorrectas.";
      mensaje.style.display = "block";
      console.warn("[LOGIN-ERR] Fallo de autenticación:", error?.message);
      return;
    }

    const { user } = data;
    const uid = user.id;
    const token = data.session.access_token;

    const { data: perfil, error: errorPerfil } = await supabase
      .from("usuarios")
      .select("rol, nombre, activo")
      .eq("id", uid)
      .single();

    if (errorPerfil || !perfil) {
      mensaje.textContent = "No se pudo obtener el perfil.";
      mensaje.style.display = "block";
      console.error("[LOGIN-ERR] Perfil no encontrado:", errorPerfil);
      return;
    }

    if (!perfil.activo) {
      mensaje.textContent = "Usuario inactivo. Contacta al administrador.";
      mensaje.style.display = "block";
      console.warn("[LOGIN-ERR] Usuario inactivo:", perfil.nombre);
      return;
    }

    // 💾 Guardar sesión local
    localStorage.setItem("uid", uid);
    localStorage.setItem("usuario", perfil.nombre || correo);
    localStorage.setItem("rol", perfil.rol);
    localStorage.setItem("correo", correo);
    localStorage.setItem("token", token);
    localStorage.setItem("sesion_activa", "true");

    console.log(`[LOGIN-OK] Usuario autenticado: ${perfil.nombre} (${perfil.rol})`);

    // 🚪 Redirigir según rol
    switch (perfil.rol) {
      case "admin":
      case "gerente":
        window.location.href = "./modules/admin-menus.html";
        break;
      case "cocina":
        window.location.href = "./modules/cocina.html";
        break;
      case "cliente_focsa":
        window.location.href = "./modules/cliente-focsa.html";
        break;
      case "dependiente":
        window.location.href = "./modules/dependiente.html";
        break;
      default:
        mensaje.textContent = "Rol no autorizado.";
        mensaje.style.display = "block";
        console.warn("[LOGIN-ERR] Rol no reconocido:", perfil.rol);
    }
  } catch (err) {
    mensaje.textContent = "Error inesperado. Intenta nuevamente.";
    mensaje.style.display = "block";
    console.error("[LOGIN-EXC] Error en iniciarSesion():", err);
  }
}
