// 🔗 [LOG:INIT-001] Conexión a Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qeqltwrkubtyrmgvgaai.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🛡️ [LOG:SESSION-002] Validación de sesión y rol
function verificarSesion(rolesPermitidos = []) {
  const usuario = localStorage.getItem("usuario");
  const rol = localStorage.getItem("rol");
  const uid = localStorage.getItem("uid");

  if (!usuario || !rol || !uid || !rolesPermitidos.includes(rol)) {
    console.warn("[LOG:SESSION-ERR] Sesión inválida o rol no autorizado");
    window.location.href = "../index.html";
    return null;
  }

  return { usuario, rol, uid };
}

document.addEventListener("DOMContentLoaded", async () => {
  const sesion = verificarSesion(["admin", "gerente"]);
  if (!sesion) return;

  const { usuario, rol, uid } = sesion;
  document.getElementById("admin-usuario").textContent = usuario;
  console.log(`[LOG:SESSION-OK] Usuario: ${usuario} | Rol: ${rol}`);

  const { data: permiso, error: rpcError } = await supabase.rpc("verificar_rol_admin", { uid });
  if (rpcError || !permiso?.autorizado) {
    console.warn(`[LOG:SESSION-ERR] RPC deniega acceso para UID: ${uid}`);
    window.location.href = "../modules/selector.html";
    return;
  }

  console.log(`[LOG:SESSION-OK] RPC confirma acceso para UID: ${uid}`);

  await cargarFiltrosDinamicos();
  await cargarMenus();

  document.getElementById("filtro-destino")?.addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-categoria")?.addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-area")?.addEventListener("change", aplicarFiltros);
});
