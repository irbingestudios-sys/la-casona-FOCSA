// 🔗 [LOG:LOGIN-001] Conexión a Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

console.log("✅ login.js cargado correctamente");
console.log("🔗 Supabase conectado:", supabase);

// 🧠 [LOG:LOGIN-002] Conectar botón al evento
document.getElementById("btn-login").addEventListener("click", iniciarSesion);

// 🔐 [LOG:LOGIN-003] Función principal de inicio de sesión
async function iniciarSesion() {
  const usuario = document.getElementById("usuario").value.trim();
  const clave = document.getElementById("clave").value.trim();
  const mensaje = document.getElementById("mensaje-error");

  mensaje.style.display = "none";

  console.log("🧪 Usuario ingresado:", usuario);
  console.log("🧪 Clave ingresada:", clave);

  if (!usuario || !clave) {
    mensaje.textContent = "Debes ingresar usuario y contraseña.";
    mensaje.style.display = "block";
    console.warn("[LOGIN-WARN] Campos vacíos");
    return;
  }

  try {
    // 🔍 Autenticación personalizada con RPC
    const { data, error } = await supabase.rpc("autenticar_usuario", {
      p_usuario: usuario,
      p_clave: clave
    });

    console.log("📥 RPC respuesta:", data);
    console.log("📥 RPC error:", error);

    if (error || !data?.[0]) {
      mensaje.textContent = "Usuario o clave incorrectos.";
      mensaje.style.display = "block";
      console.warn("[LOGIN-ERR] Fallo de autenticación:", error?.message);
      return;
    }

    const perfil = data[0];

    // 💾 Guardar sesión local
    localStorage.setItem("uid", perfil.id);
    localStorage.setItem("usuario", perfil.nombre);
    localStorage.setItem("rol", perfil.rol);
    localStorage.setItem("sesion_activa", "true");

    console.log("💾 Sesión guardada:", {
      uid: perfil.id,
      usuario: perfil.nombre,
      rol: perfil.rol
    });

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
