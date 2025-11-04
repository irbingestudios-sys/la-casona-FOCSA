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
// 🔄 [LOG:FILTROS-003] Cargar filtros desde Supabase
async function cargarFiltrosDinamicos() {
  try {
    const [destinos, areas, categorias] = await Promise.all([
      supabase.rpc("obtener_destinos_enum"),
      supabase.rpc("obtener_areas_unicas"),
      supabase.rpc("obtener_categorias_unicas")
    ]);

    if (destinos.error || areas.error || categorias.error) {
      console.error("[LOG:FILTROS-ERR]", destinos.error || areas.error || categorias.error);
      return;
    }

    poblarSelect("filtro-destino", destinos.data);
    poblarSelect("filtro-area", areas.data);
    poblarSelect("filtro-categoria", categorias.data);
    poblarDatalist("lista-categorias", categorias.data);
    poblarDatalist("lista-areas", areas.data);

    console.log("[LOG:FILTROS-OK] Filtros cargados dinámicamente");
  } catch (err) {
    console.error("[LOG:FILTROS-EXC] Error en cargarFiltrosDinamicos():", err);
  }
}

function poblarSelect(id, valores) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = `<option value="">Todos</option>`;
  valores.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.valor;
    opt.textContent = v.valor;
    select.appendChild(opt);
  });
}

function poblarDatalist(id, valores) {
  const lista = document.getElementById(id);
  if (!lista) return;
  lista.innerHTML = "";
  valores.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.valor;
    lista.appendChild(opt);
  });
}

// 📦 [LOG:MENUS-005] Cargar todos los menús
async function cargarMenus() {
  try {
    const { data, error } = await supabase.rpc("listar_menus_admin");
    if (error) throw error;
    console.log(`[LOG:MENUS-OK] ${data.length} menús cargados`);
    renderizarMenus(data);
  } catch (err) {
    console.error("[LOG:MENUS-ERR] Error en cargarMenus():", err);
  }
}
// 🎨 [LOG:RENDER-006] Renderizar menús agrupados
function renderizarMenus(menus) {
  const contenedor = document.getElementById("contenedor-menus");
  contenedor.innerHTML = "";

  if (!menus.length) {
    contenedor.innerHTML = "<p>⚠️ No hay menús disponibles con los filtros seleccionados.</p>";
    console.warn("[LOG:RENDER-WARN] Lista vacía tras renderizado");
    return;
  }

  const agrupados = agruparPorDestinoYCategoria(menus);
  for (const destino in agrupados) {
    const bloqueDestino = document.createElement("div");
    bloqueDestino.className = "grupo-destino";
    bloqueDestino.innerHTML = `<h3>${destino}</h3>`;

    for (const categoria in agrupados[destino]) {
      const bloqueCategoria = document.createElement("div");
      bloqueCategoria.className = "grupo-categoria";
      bloqueCategoria.innerHTML = `<h4>${categoria}</h4>`;

      agrupados[destino][categoria].forEach(menu => {
        const id = menu.id;
        if (!id) return;

        const fila = document.createElement("div");
        fila.className = "item-menu";
        fila.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div style="flex:1;">
              <strong>${menu.nombre}</strong> — $${menu.precio} — Stock: ${menu.stock}
              <span style="font-size:0.9em; color:#555;">📂 ${menu.categoria || "sin categoría"} | 🏷️ ${menu.area || "sin área"}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <label style="display:flex; align-items:center; gap:4px;">
                <input type="checkbox" ${menu.disponible ? "checked" : ""} onchange="marcarDisponible('${id}', this.checked)">
                Disponible
              </label>
              <button onclick="eliminarMenu('${id}')" class="btn-secundario">🗑️</button>
            </div>
          </div>
        `;
        bloqueCategoria.appendChild(fila);
      });

      bloqueDestino.appendChild(bloqueCategoria);
    }

    contenedor.appendChild(bloqueDestino);
  }

  console.log("[LOG:RENDER-OK] Menús renderizados correctamente");
}

// 🧩 [LOG:RENDER-007] Agrupar por destino y categoría
function agruparPorDestinoYCategoria(menus) {
  const resultado = {};
  menus.forEach(menu => {
    const destino = menu.destino || "sin destino";
    const categoria = menu.categoria || "sin categoría";
    if (!resultado[destino]) resultado[destino] = {};
    if (!resultado[destino][categoria]) resultado[destino][categoria] = [];
    resultado[destino][categoria].push(menu);
  });
  return resultado;
}

// 🔍 [LOG:FILTROS-008] Aplicar filtros seleccionados
async function aplicarFiltros() {
  try {
    const destino = document.getElementById("filtro-destino").value || null;
    const categoria = document.getElementById("filtro-categoria").value || null;
    const area = document.getElementById("filtro-area").value || null;

    const { data, error } = await supabase.rpc("filtrar_menus_admin_v2", {
      p_destino: destino,
      p_categoria: categoria,
      p_area: area,
      p_ordenar_por_stock: false
    });

    if (error) throw error;
    console.log(`[LOG:FILTROS-OK] ${data.length} menús filtrados`);
    renderizarMenus(data);
  } catch (err) {
    console.error("[LOG:FILTROS-ERR] Error en aplicarFiltros():", err);
  }
}

// 📝 [LOG:CREAR-009] Crear nuevo menú
async function crearMenu() {
  try {
    const nombre = document.getElementById("crear-nombre").value.trim();
    const precio = parseFloat(document.getElementById("crear-precio").value);
    const stock = parseInt(document.getElementById("crear-stock").value);
    const destino = document.getElementById("crear-destino").value;
    const categoria = document.getElementById("crear-categoria").value.trim();
    const area = document.getElementById("crear-area").value.trim();
    const orden = parseInt(document.getElementById("crear-orden").value);
    const imagen_url = document.getElementById("crear-imagen").value.trim();
    const descripcion = document.getElementById("crear-descripcion").value.trim();
    const disponible = document.getElementById("crear-disponible").checked;
    const activo = document.getElementById("crear-activo").checked;

    if (!nombre || isNaN(precio) || isNaN(stock)) {
      alert("Nombre, precio y stock son obligatorios.");
      console.warn("[LOG:CREAR-WARN] Campos obligatorios faltantes");
      return;
    }

    const payload = {
      p_nombre: nombre,
      p_precio: precio,
      p_stock: stock,
      p_destino: destino,
      p_categoria: categoria,
      p_area: area,
      p_orden: orden,
      p_imagen_url: imagen_url,
      p_descripcion: descripcion,
      p_disponible: disponible,
      p_activo: activo
    };

    const { data, error } = await supabase.rpc("crear_menu_admin", payload);
    if (error) throw error;

    console.log(`[LOG:CREAR-OK] Menú creado con ID: ${data}`);
    await registrarAuditoria("crear_menu", `Menú creado: ${nombre}`);
    cerrarFormularioCrear();
    await cargarMenus();
  } catch (err) {
    console.error("[LOG:CREAR-ERR] Error en crearMenu():", err);
  }
}
// ✅ [LOG:DISPONIBLE-010] Marcar menú como disponible/no disponible
async function marcarDisponible(id, disponible) {
  try {
    const { error } = await supabase.rpc("actualizar_disponibilidad_menu", {
      p_id: id,
      p_disponible: disponible
    });
    if (error) throw error;
    console.log(`[LOG:DISPONIBLE-OK] Menú ${id} marcado como ${disponible ? "disponible" : "no disponible"}`);
    await registrarAuditoria("actualizar_disponibilidad", `Menú ${id} disponible=${disponible}`);
  } catch (err) {
    console.error("[LOG:DISPONIBLE-ERR] Error en marcarDisponible():", err);
  }
}

// 🗑️ [LOG:ELIMINAR-011] Eliminar menú por ID
async function eliminarMenu(id) {
  if (!confirm("¿Eliminar este menú? Esta acción no se puede deshacer.")) return;
  try {
    const { error } = await supabase.rpc("eliminar_menu_admin", { p_id: id });
    if (error) throw error;
    console.log(`[LOG:ELIMINAR-OK] Menú eliminado: ${id}`);
    await registrarAuditoria("eliminar_menu", `Menú eliminado: ${id}`);
    await cargarMenus();
  } catch (err) {
    console.error("[LOG:ELIMINAR-ERR] Error en eliminarMenu():", err);
  }
}

// 📥 [LOG:IMPORTAR-012] Importar menús desde JSON
async function importarMenus() {
  try {
    const texto = document.getElementById("json-importar").value.trim();
    const json = JSON.parse(texto);
    const { data, error } = await supabase.rpc("importar_menus_json", { p_menus: json });
    if (error) throw error;
    console.log(`[LOG:IMPORTAR-OK] ${data} menús importados`);
    await registrarAuditoria("importar_menus", `Importados ${data} menús`);
    cerrarImportador();
    await cargarMenus();
  } catch (err) {
    console.error("[LOG:IMPORTAR-ERR] Error en importarMenus():", err);
    alert("Error al importar. Verifica el formato del JSON.");
  }
}

// 📤 [LOG:EXPORTAR-013] Exportar menús como CSV
async function exportarMenus() {
  try {
    const destino = document.getElementById("filtro-destino").value || null;
    const categoria = document.getElementById("filtro-categoria").value || null;
    const area = document.getElementById("filtro-area").value || null;

    const { data, error } = await supabase.rpc("exportar_menus_admin", {
      p_destino: destino,
      p_categoria: categoria,
      p_area: area,
      p_disponibles: true
    });

    if (error) throw error;
    const csv = convertirAFormatoCSV(data);
    descargarCSV(csv, "menus_exportados.csv");
    console.log(`[LOG:EXPORTAR-OK] Exportados ${data.length} menús`);
  } catch (err) {
    console.error("[LOG:EXPORTAR-ERR] Error en exportarMenus():", err);
  }
}

function convertirAFormatoCSV(data) {
  const encabezado = Object.keys(data[0]).join(",");
  const filas = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(","));
  return [encabezado, ...filas].join("\n");
}

function descargarCSV(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 📊 [LOG:STOCK-014] Actualizar stock masivo
async function guardarStockActualizado() {
  try {
    const inputs = document.querySelectorAll("#lista-stock-editable input[data-id]");
    const payload = Array.from(inputs).map(input => ({
      id: input.dataset.id,
      stock: parseInt(input.value)
    }));

    const { error } = await supabase.rpc("actualizar_stock_masivo_admin", {
      jsonb_array: payload
    });

    if (error) throw error;
    console.log(`[LOG:STOCK-OK] Stock actualizado para ${payload.length} menús`);
    await registrarAuditoria("actualizar_stock", `Stock masivo actualizado`);
    cerrarPanelActualizarStock();
    await cargarMenus();
  } catch (err) {
    console.error("[LOG:STOCK-ERR] Error en guardarStockActualizado():", err);
  }
}

// 🧾 [LOG:AUDITORIA-015] Registrar acción administrativa
async function registrarAuditoria(accion, detalle) {
  try {
    const usuario = localStorage.getItem("usuario");
    await supabase.rpc("auditar_accion_admin", {
      p_usuario: usuario,
      p_accion: accion,
      p_detalle: detalle
    });
    console.log(`[LOG:AUDITORIA-OK] Acción registrada: ${accion}`);
  } catch (err) {
    console.error("[LOG:AUDITORIA-ERR] Error en registrarAuditoria():", err);
  }
}

// 🧼 [LOG:UI-016] Controles visuales
function abrirFormularioCrear() {
  document.getElementById("formulario-crear").style.display = "block";
}
function cerrarFormularioCrear() {
  document.getElementById("formulario-crear").style.display = "none";
}
function abrirPanelActualizarStock() {
  document.getElementById("panel-actualizar-stock").style.display = "block";
}
function cerrarPanelActualizarStock() {
  document.getElementById("panel-actualizar-stock").style.display = "none";
}
function abrirImportador() {
  document.getElementById("panel-importar").style.display = "block";
}
function cerrarImportador() {
  document.getElementById("panel-importar").style.display = "none";
}
function cerrarPanelAdminMenus() {
  window.location.href = "../modules/selector.html";
}
