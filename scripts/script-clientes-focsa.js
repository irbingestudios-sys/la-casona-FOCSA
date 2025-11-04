import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔐 Inicializar Supabase
const supabase = createClient(
  "https://qeqltwrkubtyrmgvgaai.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcWx0d3JrdWJ0eXJtZ3ZnYWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMjY1MjMsImV4cCI6MjA3NzgwMjUyM30.Yfdjj6IT0KqZqOtDfWxytN4lsK2KOBhIAtFEfBaVRAw"
);

console.log("✅ Supabase inicializado");

// 📦 Variables globales
const menuDiv = document.getElementById("menu");
const filtroSelect = document.getElementById("filtro");
const cantidadesSeleccionadas = {};
let menu = [];

async function cargarMenu() {
  console.log("🔄 Cargando menú desde Supabase...");
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("visible_en_menu", true)
    .gt("stock_actual", 0)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("❌ Error al cargar menú:", error);
    alert("Error al cargar el menú");
    return;
  }

  console.log("✅ Menú cargado:", data);
  menu = data;

  const categorias = [...new Set(menu.map(item => item.categoria).filter(Boolean))];
  filtroSelect.innerHTML = '<option value="todos">Todas</option>';
  categorias.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    filtroSelect.appendChild(option);
  });

  mostrarMenuAgrupado(menu);
}

function mostrarMenuAgrupado(platos) {
  console.log("📊 Mostrando menú agrupado por categoría...");
  menuDiv.innerHTML = "";
  const agrupado = {};

  platos.forEach(item => {
    if (!agrupado[item.categoria]) agrupado[item.categoria] = [];
    agrupado[item.categoria].push(item);
  });

  for (const categoria in agrupado) {
    const grupo = agrupado[categoria];
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "categoria-grupo";

    const titulo = document.createElement("h3");
    titulo.textContent = categoria;
    grupoDiv.appendChild(titulo);

    grupo.forEach(item => {
      const key = item.nombre;
      const cantidadGuardada = cantidadesSeleccionadas[key] || 0;

      const div = document.createElement("div");
      div.className = "menu-item";
      div.innerHTML = `
        <label>
          <strong>${item.nombre}</strong> - ${item.precio} CUP
          <input type="number" min="0" max="${item.stock_actual}" value="${cantidadGuardada}" data-name="${item.nombre}" data-price="${item.precio}" />
        </label>
      `;
      grupoDiv.appendChild(div);
    });

    menuDiv.appendChild(grupoDiv);
  }

  document.querySelectorAll("input[type='number']").forEach(input => {
    input.addEventListener("input", () => {
      const nombre = input.dataset.name;
      const cantidad = parseInt(input.value) || 0;
      cantidadesSeleccionadas[nombre] = cantidad;
      calcularTotal();
    });
  });

  calcularTotal();
}

function filtrarMenu() {
  const seleccion = filtroSelect.value;
  console.log("🔍 Filtrando menú por categoría:", seleccion);
  if (seleccion === "todos") {
    mostrarMenuAgrupado(menu);
  } else {
    const filtrado = menu.filter(item => item.categoria === seleccion);
    mostrarMenuAgrupado(filtrado);
  }
}

function calcularTotal() {
  let total = 0;
  for (const nombre in cantidadesSeleccionadas) {
    const cantidad = cantidadesSeleccionadas[nombre];
    const plato = menu.find(p => p.nombre === nombre);
    if (plato && cantidad > 0) {
      total += cantidad * plato.precio;
    }
  }
  console.log("💰 Total calculado:", total);
  document.getElementById("total").textContent = total.toFixed(2);
}

async function enviarPedido() {
  const cliente = document.getElementById("cliente").value.trim();
  const piso = document.getElementById("piso").value.trim();
  const apartamento = document.getElementById("apartamento").value.trim();

  if (!cliente || !piso || !apartamento) {
    console.warn("⚠️ Datos incompletos del cliente");
    alert("Por favor, completa nombre, piso y apartamento");
    return;
  }

  let resumenHTML = `<p><strong>Cliente:</strong> ${cliente}<br><strong>Piso:</strong> ${piso}<br><strong>Apartamento:</strong> ${apartamento}</p><ul>`;
  let mensaje = `Pedido para: ${cliente}\nPiso: ${piso}\nApartamento: ${apartamento}\n\n`;
  let total = 0;
  let items = [];

  for (const nombre in cantidadesSeleccionadas) {
    const cantidad = cantidadesSeleccionadas[nombre];
    const plato = menu.find(p => p.nombre === nombre);
    if (cantidad > 0 && plato) {
      const subtotal = cantidad * plato.precio;
      mensaje += `- ${nombre} x${cantidad} = ${subtotal} CUP\n`;
      resumenHTML += `<li>${nombre} x${cantidad} = ${subtotal} CUP</li>`;
      total += subtotal;
      items.push({ nombre, cantidad, subtotal });
    }
  }

  if (items.length === 0) {
    console.warn("⚠️ No se seleccionó ningún plato");
    alert("Selecciona al menos un plato");
    return;
  }

  mensaje += `\nTotal: ${total} CUP`;
  resumenHTML += `</ul><p><strong>Total:</strong> ${total} CUP</p>`;

  console.log("📦 Enviando pedido a Supabase...");
  const { data: pedido, error } = await supabase
    .from("pedidos")
    .insert([{
      cliente,
      piso,
      apartamento,
      local: "FOCSA",
      tipo: "FOCSA",
      fecha: new Date().toISOString(),
      total,
      entregado: false
    }])
    .select()
    .single();

  if (error) {
    console.error("❌ Error al guardar el pedido:", error);
    alert("Error al guardar el pedido");
    return;
  }

  console.log("✅ Pedido registrado:", pedido);

  for (const item of items) {
    const { error: itemError } = await supabase.from("pedido_items").insert([{
      pedido_id: pedido.id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      subtotal: item.subtotal
    }]);
    if (itemError) {
      console.error("❌ Error al guardar ítem:", item, itemError);
    } else {
      console.log("🧾 Ítem guardado:", item);
    }
  }

  document.getElementById("resumen").innerHTML = resumenHTML;
  document.getElementById("confirmacion").style.display = "block";
  window.mensajeWhatsApp = mensaje;
}

function enviarWhatsApp() {
  const numero = "5350971023";
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(window.mensajeWhatsApp)}`;
  console.log("📤 Enviando a WhatsApp:", url);
  window.open(url, "_blank");
  document.getElementById("confirmacion").style.display = "none";
}

function cancelar() {
  console.log("❌ Pedido cancelado por el cliente");
  document.getElementById("confirmacion").style.display = "none";
}

// 🚀 Inicializar
window.filtrarMenu = filtrarMenu;
window.enviarPedido = enviarPedido;
window.enviarWhatsApp = enviarWhatsApp;
window.cancelar = cancelar;

cargarMenu();
