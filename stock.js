/* =========================================================
   MYCFOODS · STOCK — inventario simple con alerta de mínimo
   Requiere caja-core.js cargado antes.
   Carga manual (no descuenta solo al vender).
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

let stockEditingId = null;

function renderStockForm() {
  const card = document.getElementById("stock-form-card");
  if (!card) return;

  const data = stockLoad();
  const editing = stockEditingId ? data.items.find(function (x) { return x.id === stockEditingId; }) : null;

  let html = '<div class="stat-label" style="margin-bottom:10px;">' + (editing ? "Editar insumo" : "Agregar insumo") + '</div>';
  html += '<div class="caja-row">';
  html += '<input class="caja-input" id="stock-nombre" style="flex:2;" placeholder="Nombre (ej: Pan ciabatta)" value="' + (editing ? escapeHtml(editing.nombre) : "") + '">';
  html += '<input class="caja-input" id="stock-unidad" style="flex:1;" placeholder="Unidad (ej: unid., kg)" value="' + (editing ? escapeHtml(editing.unidad) : "") + '">';
  html += '</div>';
  html += '<div class="caja-row">';
  html += '<input class="caja-input" id="stock-cantidad" type="number" style="flex:1;" placeholder="Cantidad actual" value="' + (editing ? editing.cantidadActual : "") + '">';
  html += '<input class="caja-input" id="stock-minimo" type="number" style="flex:1;" placeholder="Mínimo (alerta)" value="' + (editing ? editing.minimo : "") + '">';
  html += '</div>';
  html += '<div class="caja-row">';
  html += '<button class="caja-btn caja-btn-primary" style="flex:1;" onclick="guardarStock()">' + (editing ? "Guardar cambios" : "+ Agregar") + '</button>';
  if (editing) html += '<button class="caja-btn caja-btn-ghost" onclick="cancelarEdicionStock()">Cancelar</button>';
  html += '</div>';

  card.innerHTML = html;
}

function renderStockList() {
  const card = document.getElementById("stock-list-card");
  if (!card) return;

  const data = stockLoad();
  if (data.items.length === 0) {
    card.innerHTML = '<div class="empty-note">Todavía no cargaste insumos.</div>';
    return;
  }

  let html = '<div class="stat-label" style="margin-bottom:6px;">Insumos cargados</div>';
  data.items.forEach(function (it) {
    const bajo = Number(it.cantidadActual) <= Number(it.minimo);
    html += '<div class="data-row">';
    html += '<span style="flex:1;">' + escapeHtml(it.nombre) + '</span>';
    html += '<span class="' + (bajo ? "low-stock" : "") + '" style="font-family:\'Courier New\',monospace; font-size:0.85rem;">' + it.cantidadActual + ' ' + escapeHtml(it.unidad) + '</span>';
    if (bajo) html += '<span title="Por debajo del mínimo (' + it.minimo + ')"><i class="fa-solid fa-triangle-exclamation low-stock"></i></span>';
    html += '<button class="mov-del" onclick="editarStock(\'' + it.id + '\')"><i class="fa-solid fa-pen"></i></button>';
    html += '<button class="mov-del" onclick="borrarStock(\'' + it.id + '\')"><i class="fa-solid fa-trash"></i></button>';
    html += '</div>';
  });

  card.innerHTML = html;
}

function editarStock(id) {
  stockEditingId = id;
  renderStockForm();
}

function cancelarEdicionStock() {
  stockEditingId = null;
  renderStockForm();
}

function guardarStock() {
  const nombre = document.getElementById("stock-nombre").value.trim();
  const unidad = document.getElementById("stock-unidad").value.trim();
  const cantidad = parseFloat(document.getElementById("stock-cantidad").value) || 0;
  const minimo = parseFloat(document.getElementById("stock-minimo").value) || 0;

  if (!nombre) { alert("Ingresá un nombre."); return; }

  const data = stockLoad();
  if (stockEditingId) {
    const it = data.items.find(function (x) { return x.id === stockEditingId; });
    if (it) { it.nombre = nombre; it.unidad = unidad; it.cantidadActual = cantidad; it.minimo = minimo; }
    stockEditingId = null;
  } else {
    data.items.push({ id: cajaUid(), nombre: nombre, unidad: unidad, cantidadActual: cantidad, minimo: minimo });
  }
  stockSave(data);
  renderStockForm();
  renderStockList();
}

function borrarStock(id) {
  if (!confirm("¿Borrar este insumo?")) return;
  const data = stockLoad();
  data.items = data.items.filter(function (x) { return x.id !== id; });
  stockSave(data);
  if (stockEditingId === id) stockEditingId = null;
  renderStockForm();
  renderStockList();
}

document.addEventListener("DOMContentLoaded", function () {
  renderStockForm();
  renderStockList();
});
