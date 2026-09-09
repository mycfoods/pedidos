/* =========================================================
   MYCFOODS · COCINA — pantalla de comandas (KDS)
   Requiere caja-core.js cargado antes.
   IMPORTANTE: esto lee datos guardados en el navegador
   (localStorage). Funciona en tiempo real entre pestañas
   del MISMO dispositivo/navegador, pero no se sincroniza
   solo entre dispositivos distintos (ver nota en Config).
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

const KDS_ORDEN = ["pendiente", "en_preparacion", "listo", "entregado"];
const KDS_LABELS = { pendiente: "Pendiente", en_preparacion: "En preparación", listo: "Listo", entregado: "Entregado" };
const KDS_BOTON = { pendiente: "Empezar", en_preparacion: "Marcar listo", listo: "Entregar" };

function origenLabel(c) {
  if (c.origen === "mesa") return "Mesa: " + c.referencia;
  const tipo = c.tipoEntrega || "";
  return (tipo ? tipo + " — " : "") + (c.referencia || "Cliente");
}

function renderCocina() {
  const data = comandasLoad();
  const today = cajaTodayStr();
  const comandasHoy = data.comandas
    .filter(function (c) { return c.fecha === today; })
    .sort(function (a, b) { return a.hora < b.hora ? -1 : 1; });

  const cont = document.getElementById("kds-columns");
  if (!cont) return;

  cont.innerHTML = KDS_ORDEN.map(function (estado) {
    const items = comandasHoy.filter(function (c) { return c.estado === estado; });
    let html = '<div class="kds-column">';
    html += '<div class="kds-column-title"><span>' + KDS_LABELS[estado] + '</span><span>' + items.length + '</span></div>';

    if (items.length === 0) {
      html += '<div class="empty-note">Sin comandas.</div>';
    } else {
      items.forEach(function (c) {
        html += '<div class="kds-card">';
        html += '<div class="kds-card-head"><span>' + escapeHtml(origenLabel(c)) + '</span><span class="kds-card-time">' + c.hora + '</span></div>';
        c.items.forEach(function (it) {
          html += '<div class="kds-item">' + it.cantidad + ' x ' + escapeHtml(it.nombre) + '</div>';
        });
        if (c.direccion) html += '<div class="kds-item" style="color:var(--accent);">📍 ' + escapeHtml(c.direccion) + '</div>';
        if (c.notas) html += '<div class="kds-item" style="font-style:italic;">"' + escapeHtml(c.notas) + '"</div>';
        if (KDS_BOTON[estado]) {
          html += '<button class="caja-btn caja-btn-primary caja-btn-block" style="margin-top:10px;" onclick="avanzarComandaUI(\'' + c.id + '\')">' + KDS_BOTON[estado] + '</button>';
        }
        html += '<button class="caja-btn caja-btn-ghost caja-btn-block" style="margin-top:6px;" onclick="abrirEdicionComanda(\'' + c.id + '\')"><i class="fa-solid fa-pen"></i> Editar</button>';
        html += '</div>';
      });
    }

    html += '</div>';
    return html;
  }).join("");
}

function avanzarComandaUI(id) {
  cajaAvanzarComanda(id);
  renderCocina();
}

/* =========================================================
   EDICIÓN DE COMANDA (modal) — desde cualquiera de las 4 columnas
========================================================= */
let comandaModalId = null;
let comandaModalCategoria = null;

function abrirEdicionComanda(id) {
  comandaModalId = id;
  const menu = menuLoad();
  const cats = [];
  menu.products.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
  comandaModalCategoria = cats[0] || null;
  renderComandaModal();
  document.getElementById("comanda-modal").classList.add("open");
}

function cerrarComandaModal() {
  document.getElementById("comanda-modal").classList.remove("open");
  comandaModalId = null;
}

function getComandaActual() {
  const data = comandasLoad();
  return data.comandas.find(function (x) { return x.id === comandaModalId; });
}

function renderComandaModal() {
  const c = getComandaActual();
  const box = document.getElementById("comanda-modal-content");
  if (!c || !box) return;

  let html = '<div class="mc-modal-title"><h3>' + escapeHtml(origenLabel(c)) + '</h3><button class="mc-modal-close" onclick="cerrarComandaModal()"><i class="fa-solid fa-xmark"></i></button></div>';

  html += '<div class="stat-label" style="margin-bottom:6px;">Estado</div>';
  html += '<div class="caja-row" style="margin-bottom:14px;">';
  html += KDS_ORDEN.map(function (est) {
    return '<button class="chip ' + (c.estado === est ? "active" : "") + '" onclick="cambiarEstadoComanda(\'' + est + '\')">' + KDS_LABELS[est] + '</button>';
  }).join("");
  html += '</div>';

  if (c.items.length > 0) {
    html += '<div class="stat-label" style="margin-bottom:6px;">Ítems</div>';
    c.items.forEach(function (it, i) {
      html += '<div class="mc-item-row" style="align-items:center;">' +
        '<span>' + it.cantidad + ' x ' + escapeHtml(it.nombre) + '</span>' +
        '<span style="display:flex; align-items:center; gap:6px;">' +
        '<button class="mov-del" onclick="cambiarCantidadItemComanda(' + i + ', -1)"><i class="fa-solid fa-minus"></i></button>' +
        '<button class="mov-del" onclick="cambiarCantidadItemComanda(' + i + ', 1)"><i class="fa-solid fa-plus"></i></button>' +
        '<button class="mov-del" onclick="quitarItemComanda(' + i + ')"><i class="fa-solid fa-trash"></i></button>' +
        '</span></div>';
    });
  } else {
    html += '<div class="empty-note">Sin ítems.</div>';
  }

  const menu = menuLoad();
  const cats = [];
  menu.products.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
  if (!comandaModalCategoria || cats.indexOf(comandaModalCategoria) === -1) comandaModalCategoria = cats[0];

  html += '<div class="stat-label" style="margin:14px 0 6px;">Agregar producto</div>';
  html += '<div class="caja-row" style="overflow-x:auto; flex-wrap:nowrap; margin-bottom:8px;">';
  html += cats.map(function (cat) { return '<button class="chip ' + (cat === comandaModalCategoria ? "active" : "") + '" onclick="comandaModalCategoria=\'' + cat.replace(/'/g, "\\'") + '\'; renderComandaModal();">' + escapeHtml(cat) + '</button>'; }).join("");
  html += '</div>';
  html += '<div style="max-height:140px; overflow-y:auto; margin-bottom:14px;">';
  html += menu.products.filter(function (p) { return p.category === comandaModalCategoria; }).map(function (p) {
    return '<div class="menu-item-row"><span class="menu-item-name">' + escapeHtml(p.name) + '</span><span class="menu-item-price">' + cajaFmtMoney(p.price) + '</span>' +
      '<button class="menu-item-btn-add" onclick="agregarItemComanda(\'' + p.name.replace(/'/g, "\\'") + '\', ' + p.price + ')">+</button></div>';
  }).join("");
  html += '</div>';

  html += '<textarea class="caja-input" id="comanda-notas" placeholder="Notas / observaciones" style="margin-bottom:12px; min-height:60px;" onchange="actualizarNotasComanda(this.value)">' + escapeHtml(c.notas || "") + '</textarea>';

  html += '<button class="caja-btn caja-btn-ghost caja-btn-block" onclick="borrarComandaActual()"><i class="fa-solid fa-trash"></i> Borrar esta comanda</button>';

  box.innerHTML = html;
}

function cambiarEstadoComanda(estado) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === comandaModalId; });
  if (!c) return;
  c.estado = estado;
  comandasSave(data);
  renderComandaModal();
  renderCocina();
}

function cambiarCantidadItemComanda(index, delta) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === comandaModalId; });
  if (!c) return;
  c.items[index].cantidad += delta;
  if (c.items[index].cantidad <= 0) c.items.splice(index, 1);
  comandasSave(data);
  renderComandaModal();
  renderCocina();
}

function quitarItemComanda(index) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === comandaModalId; });
  if (!c) return;
  c.items.splice(index, 1);
  comandasSave(data);
  renderComandaModal();
  renderCocina();
}

function agregarItemComanda(nombre, precio) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === comandaModalId; });
  if (!c) return;
  const existente = c.items.find(function (it) { return it.nombre === nombre; });
  if (existente) existente.cantidad += 1;
  else c.items.push({ nombre: nombre, precio: precio, cantidad: 1 });
  comandasSave(data);
  renderComandaModal();
  renderCocina();
}

function actualizarNotasComanda(valor) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === comandaModalId; });
  if (!c) return;
  c.notas = valor;
  comandasSave(data);
}

function borrarComandaActual() {
  if (!confirm("¿Borrar esta comanda? Esto no borra la venta ya registrada en Caja, solo la saca de la cola de cocina.")) return;
  const data = comandasLoad();
  data.comandas = data.comandas.filter(function (x) { return x.id !== comandaModalId; });
  comandasSave(data);
  cerrarComandaModal();
  renderCocina();
}

document.addEventListener("DOMContentLoaded", function () {
  cajaAplicarTema();
  cajaInitNavDropdown();
  renderCocina();
  setInterval(renderCocina, 4000);
});
