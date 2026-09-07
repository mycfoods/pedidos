/* =========================================================
   MYCFOODS · SALÓN — gestión de mesas
   Requiere caja-core.js cargado antes.
========================================================= */

let mesaModalId = null;
let mesaModalCategoria = null;
let mesaModalCobrando = false;

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function renderMesas() {
  const data = mesasLoad();
  const grid = document.getElementById("mesa-grid");
  if (!grid) return;

  grid.innerHTML = data.mesas.map(function (m) {
    const total = mesaTotal(m);
    const estadoLabel = m.estado === "libre" ? "LIBRE" : m.estado === "cuenta" ? "PIDIÓ CUENTA" : "OCUPADA" + (total > 0 ? " (" + cajaFmtMoney(total) + ")" : "");
    return '<div class="mesa-card ' + m.estado + '" onclick="abrirMesa(\'' + m.id + '\')">' +
      '<span class="mesa-nombre">' + escapeHtml(m.nombre) + '</span>' +
      '<span class="mesa-badge ' + m.estado + '">' + estadoLabel + '</span>' +
      '<span class="mesa-meta">' + m.capacidad + ' pers. &middot; ' + escapeHtml(m.sector) + (m.mozo ? " &middot; " + escapeHtml(m.mozo) : "") + '</span>' +
      '</div>';
  }).join("");
}

function agregarMesaNueva() {
  const nombre = prompt("Nombre de la mesa (ej: Mesa 05):");
  if (!nombre) return;
  const capacidad = parseInt(prompt("Capacidad (personas):", "4")) || 4;
  const sector = prompt("Sector (ej: Salón Principal):", "Salón Principal") || "Salón Principal";
  const data = mesasLoad();
  data.mesas.push({ id: cajaUid(), nombre: nombre, capacidad: capacidad, sector: sector, estado: "libre", mozo: "", items: [], notas: "" });
  mesasSave(data);
  renderMesas();
}

function borrarMesaActual() {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  if (m.estado !== "libre") { alert("Solo se pueden borrar mesas libres. Cerrá la cuenta primero."); return; }
  if (!confirm("¿Borrar " + m.nombre + "?")) return;
  data.mesas = data.mesas.filter(function (x) { return x.id !== mesaModalId; });
  mesasSave(data);
  cerrarModalMesa();
  renderMesas();
}

/* =========================================================
   MODAL DE MESA
========================================================= */
function abrirMesa(id) {
  mesaModalId = id;
  mesaModalCobrando = false;
  const menu = menuLoad();
  const cats = [];
  menu.products.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
  mesaModalCategoria = cats[0] || null;
  renderMesaModal();
  document.getElementById("mesa-modal").classList.add("open");
}

function cerrarModalMesa() {
  document.getElementById("mesa-modal").classList.remove("open");
  mesaModalId = null;
}

function getMesaActual() {
  const data = mesasLoad();
  return data.mesas.find(function (x) { return x.id === mesaModalId; });
}

function renderMesaModal() {
  const box = document.getElementById("mesa-modal-content");
  const m = getMesaActual();
  if (!m || !box) return;

  const total = mesaTotal(m);

  let html = '<div class="mc-modal-title"><h3>' + escapeHtml(m.nombre) + '</h3><button class="mc-modal-close" onclick="cerrarModalMesa()"><i class="fa-solid fa-xmark"></i></button></div>';

  if (mesaModalCobrando) {
    // Selección de forma de pago para cerrar la cuenta
    const metodos = getMetodosPago();
    html += '<div class="stat-label" style="margin-bottom:10px;">Total a cobrar</div>';
    html += '<div style="text-align:center; font-family:\'Courier New\',monospace; font-size:1.7rem; font-weight:800; color:var(--accent); margin-bottom:16px;">' + cajaFmtMoney(total) + '</div>';
    html += '<div class="stat-label" style="margin-bottom:8px;">Forma de pago</div>';
    html += '<div class="caja-row" style="margin-bottom:16px;">';
    html += metodos.map(function (met) { return '<button class="chip" onclick="confirmarCobroMesa(\'' + met.replace(/'/g, "\\'") + '\')">' + escapeHtml(met) + '</button>'; }).join("");
    html += '</div>';
    html += '<button class="caja-btn caja-btn-ghost caja-btn-block" onclick="mesaModalCobrando=false; renderMesaModal();">Volver</button>';
    box.innerHTML = html;
    return;
  }

  // Mozo y notas
  html += '<div class="caja-row" style="margin-bottom:10px;">';
  html += '<div class="caja-field"><label>Mozo/a</label><input class="caja-input" value="' + escapeHtml(m.mozo) + '" onchange="actualizarMozoMesa(this.value)"></div>';
  html += '</div>';

  // Total y estado
  html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">';
  html += '<span class="stat-label">Estado: ' + (m.estado === "libre" ? "Libre" : m.estado === "cuenta" ? "Pidió cuenta" : "Ocupada") + '</span>';
  html += '<span style="font-family:\'Courier New\',monospace; font-size:1.2rem; font-weight:800; color:var(--accent);">' + cajaFmtMoney(total) + '</span>';
  html += '</div>';

  // Items actuales
  if (m.items.length > 0) {
    html += '<div class="stat-label" style="margin-bottom:6px;">Pedido de la mesa</div>';
    m.items.forEach(function (it, i) {
      html += '<div class="mc-item-row">' +
        '<span>' + it.cantidad + ' x ' + escapeHtml(it.nombre) + '</span>' +
        '<span style="display:flex; align-items:center; gap:8px;">' + cajaFmtMoney(it.precio * it.cantidad) +
        ' <button class="mov-del" onclick="quitarItemMesa(' + i + ')"><i class="fa-solid fa-xmark"></i></button></span>' +
        '</div>';
    });
  }

  // Selector de menú para agregar
  const menu = menuLoad();
  const cats = [];
  menu.products.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
  if (!mesaModalCategoria || cats.indexOf(mesaModalCategoria) === -1) mesaModalCategoria = cats[0];

  html += '<div class="stat-label" style="margin:14px 0 8px;">Agregar productos</div>';
  html += '<div class="caja-row" style="margin-bottom:10px; overflow-x:auto; flex-wrap:nowrap;">';
  html += cats.map(function (c) { return '<button class="chip ' + (c === mesaModalCategoria ? "active" : "") + '" onclick="seleccionarCategoriaMesa(\'' + c.replace(/'/g, "\\'") + '\')">' + escapeHtml(c) + '</button>'; }).join("");
  html += '</div>';

  html += '<div style="max-height:180px; overflow-y:auto; margin-bottom:16px;">';
  html += menu.products.filter(function (p) { return p.category === mesaModalCategoria; }).map(function (p) {
    return '<div class="menu-item-row">' +
      '<span class="menu-item-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="menu-item-price">' + cajaFmtMoney(p.price) + '</span>' +
      '<button class="menu-item-btn-add" onclick="agregarItemMesa(\'' + p.name.replace(/'/g, "\\'") + '\', ' + p.price + ')">+</button>' +
      '</div>';
  }).join("");
  html += '</div>';

  // Acciones
  html += '<div class="caja-row" style="margin-bottom:8px;">';
  if (m.estado !== "cuenta") {
    html += '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="marcarPidioCuenta()">Pidió cuenta</button>';
  } else {
    html += '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="volverAOcupada()">Volver a ocupada</button>';
  }
  html += '</div>';
  html += '<div class="caja-row" style="margin-bottom:8px;">';
  html += '<button class="caja-btn caja-btn-primary" style="flex:1;" ' + (m.items.length === 0 ? "disabled" : "") + ' onclick="mesaModalCobrando=true; renderMesaModal();"><i class="fa-solid fa-cash-register"></i> Cobrar y liberar</button>';
  html += '</div>';
  html += '<div class="caja-row">';
  html += '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="liberarMesaSinCobrar()">Liberar sin cobrar</button>';
  if (m.estado === "libre") html += '<button class="caja-btn caja-btn-ghost" onclick="borrarMesaActual()"><i class="fa-solid fa-trash"></i></button>';
  html += '</div>';

  box.innerHTML = html;
}

function seleccionarCategoriaMesa(cat) {
  mesaModalCategoria = cat;
  renderMesaModal();
}

function agregarItemMesa(nombre, precio) {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  const existente = m.items.find(function (it) { return it.nombre === nombre; });
  if (existente) existente.cantidad += 1;
  else m.items.push({ nombre: nombre, precio: precio, cantidad: 1 });
  if (m.estado === "libre") m.estado = "ocupada";
  mesasSave(data);
  renderMesaModal();
  renderMesas();
}

function quitarItemMesa(index) {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  m.items.splice(index, 1);
  mesasSave(data);
  renderMesaModal();
  renderMesas();
}

function actualizarMozoMesa(valor) {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  m.mozo = valor;
  mesasSave(data);
  renderMesas();
}

function marcarPidioCuenta() {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  m.estado = "cuenta";
  mesasSave(data);
  renderMesaModal();
  renderMesas();
}

function volverAOcupada() {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  m.estado = "ocupada";
  mesasSave(data);
  renderMesaModal();
  renderMesas();
}

function confirmarCobroMesa(metodo) {
  const data = mesasLoad();
  const m = data.mesas.find(function (x) { return x.id === mesaModalId; });
  if (!m) return;
  const total = mesaTotal(m);

  cajaAddTransaction({
    type: "ingreso",
    ledger: "principal",
    date: cajaTodayStr(),
    category: "Ventas salón",
    method: metodo,
    amount: total,
    note: "Mesa: " + m.nombre + (m.mozo ? " (mozo: " + m.mozo + ")" : ""),
    items: m.items,
  });

  cajaCrearComanda({
    origen: "mesa",
    referencia: m.nombre,
    tipoEntrega: "Salón",
    items: m.items,
    notas: m.notas || "",
  });

  m.estado = "libre";
  m.items = [];
  m.mozo = "";
  m.notas = "";
  mesasSave(data);

  mesaModalCobrando = false;
  cerrarModalMesa();
  renderMesas();
  alert("Cobrado " + cajaFmtMoney(total) + " (" + metodo + "). Mesa liberada.");
}

function liberarMesaSinCobrar() {
  const m = getMesaActual();
  if (!m) return;
  if (m.items.length > 0 && !confirm("La mesa tiene un pedido cargado sin cobrar. ¿Liberar igual (se pierde el pedido)?")) return;
  const data = mesasLoad();
  const mm = data.mesas.find(function (x) { return x.id === mesaModalId; });
  mm.estado = "libre";
  mm.items = [];
  mm.mozo = "";
  mm.notas = "";
  mesasSave(data);
  cerrarModalMesa();
  renderMesas();
}

document.addEventListener("DOMContentLoaded", function () {
  renderMesas();
});
