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

document.addEventListener("DOMContentLoaded", function () {
  renderCocina();
  setInterval(renderCocina, 4000);
});
