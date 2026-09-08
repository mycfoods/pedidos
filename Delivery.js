/* =========================================================
   MYCFOODS · DELIVERY — despacho y seguimiento de repartos
   Requiere caja-core.js cargado antes.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

const DELIVERY_ESTADOS = ["pendiente", "en_camino", "entregado"];
const DELIVERY_LABELS = { pendiente: "Pendiente", en_camino: "En camino", entregado: "Entregado" };
const DELIVERY_BOTON = { pendiente: "Despachar (en camino)", en_camino: "Marcar entregado" };
const DELIVERY_COLOR = { pendiente: "#e2564a", en_camino: "var(--accent)", entregado: "#5fa372" };

function renderDelivery() {
  const data = comandasLoad();
  const today = cajaTodayStr();
  const lista = data.comandas
    .filter(function (c) { return c.tipoEntrega === "Delivery" && c.fecha === today; })
    .sort(function (a, b) { return a.hora < b.hora ? 1 : -1; });

  const cont = document.getElementById("delivery-list");
  if (!cont) return;

  if (lista.length === 0) {
    cont.innerHTML = '<div class="caja-card empty-note">No hay pedidos de delivery hoy.</div>';
    return;
  }

  cont.innerHTML = lista.map(function (c) {
    const estado = c.estadoEntrega || "pendiente";
    let html = '<div class="caja-card">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
    html += '<span style="font-weight:700; font-size:0.95rem;">' + escapeHtml(c.referencia) + '</span>';
    html += '<span style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:20px; color:' + DELIVERY_COLOR[estado] + '; border:1px solid ' + DELIVERY_COLOR[estado] + ';">' + DELIVERY_LABELS[estado] + '</span>';
    html += '</div>';
    html += '<div class="stat-sub" style="margin-bottom:6px;">🕐 ' + c.hora + (c.direccion ? ' &middot; 📍 ' + escapeHtml(c.direccion) : '') + '</div>';
    c.items.forEach(function (it) {
      html += '<div class="mc-item-row"><span>' + it.cantidad + ' x ' + escapeHtml(it.nombre) + '</span><span>' + cajaFmtMoney(it.precio * it.cantidad) + '</span></div>';
    });
    if (c.notas) html += '<div class="stat-sub" style="margin-top:6px; font-style:italic;">"' + escapeHtml(c.notas) + '"</div>';

    html += '<div class="caja-row" style="margin-top:12px;">';
    html += '<input class="caja-input" placeholder="Repartidor (opcional)" value="' + escapeHtml(c.repartidor || "") + '" onchange="asignarRepartidor(\'' + c.id + '\', this.value)" style="flex:1;">';
    html += '</div>';

    if (DELIVERY_BOTON[estado]) {
      html += '<button class="caja-btn caja-btn-primary caja-btn-block" style="margin-top:10px;" onclick="avanzarDelivery(\'' + c.id + '\')">' + DELIVERY_BOTON[estado] + '</button>';
    }
    html += '</div>';
    return html;
  }).join("");
}

function asignarRepartidor(id, valor) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === id; });
  if (!c) return;
  c.repartidor = valor;
  comandasSave(data);
}

function avanzarDelivery(id) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === id; });
  if (!c) return;
  const idx = DELIVERY_ESTADOS.indexOf(c.estadoEntrega || "pendiente");
  if (idx >= 0 && idx < DELIVERY_ESTADOS.length - 1) c.estadoEntrega = DELIVERY_ESTADOS[idx + 1];
  comandasSave(data);
  renderDelivery();
}

document.addEventListener("DOMContentLoaded", function () {
  renderDelivery();
  setInterval(renderDelivery, 5000);
});
        
