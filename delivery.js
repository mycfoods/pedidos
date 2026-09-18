/* =========================================================
   MYCFOODS · PENDIENTES DE PAGO — gestión y cobro al retirar
   Requiere caja-core.js cargado antes.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

const PAGO_LABELS = { pendiente: "⏳ Pago Pendiente", cobrado: "✅ Pagado" };
const PAGO_COLOR = { pendiente: "#e2564a", cobrado: "#5fa372" };

function renderPendientesPago() {
  const data = comandasLoad();
  const today = cajaTodayStr();
  
  // Filtramos los pedidos del día que sean de Retiro o que tengan pago pendiente
  const lista = data.comandas
    .filter(function (c) { return c.fecha === today; })
    .sort(function (a, b) { return a.hora < b.hora ? 1 : -1; });

  const cont = document.getElementById("delivery-list");
  if (!cont) return;

  if (lista.length === 0) {
    cont.innerHTML = '<div class="caja-card empty-note">No hay pedidos registrados hoy.</div>';
    return;
  }

  cont.innerHTML = lista.map(function (c) {
    const estadoPago = c.estadoPago || (c.pago === "pendiente" ? "pendiente" : "cobrado");
    let html = '<div class="caja-card">';
    
    // Cabecera de la tarjeta
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';
    html += '<span style="font-weight:700; font-size:0.95rem;">' + escapeHtml(c.referencia || c.nombre) + '</span>';
    html += '<span style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:20px; color:' + PAGO_COLOR[estadoPago] + '; border:1px solid ' + PAGO_COLOR[estadoPago] + ';">' + PAGO_LABELS[estadoPago] + '</span>';
    html += '</div>';
    
    // Subtítulo con hora, cliente y forma de pago actual
    html += '<div class="stat-sub" style="margin-bottom:6px;">🕐 ' + c.hora + ' &middot; 👤 ' + escapeHtml(c.nombre || "Cliente") + ' &middot; 💳 <i>' + escapeHtml(c.pago) + '</i></div>';
    
    // Items del pedido
    c.items.forEach(function (it) {
      html += '<div class="mc-item-row"><span>' + it.cantidad + ' x ' + escapeHtml(it.nombre) + '</span><span>' + cajaFmtMoney(it.precio * it.cantidad) + '</span></div>';
    });
    
    if (c.notas) html += '<div class="stat-sub" style="margin-top:6px; font-style:italic;">"' + escapeHtml(c.notas) + '"</div>';

    // Si el pago está pendiente, mostramos el selector de medio de pago real y el botón para confirmar
    if (estadoPago === "pendiente") {
      html += '<div class="caja-row" style="margin-top:12px; gap:8px; display:flex; flex-direction:column;">';
      html += '<select id="pago-real-' + c.id + '" class="caja-input" style="width:100%;">';
      html += '<option value="" disabled selected>Elegir pago real (Efectivo / Transferencia)...</option>';
      html += '<option value="Efectivo">Efectivo</option>';
      html += '<option value="Transferencia">Transferencia</option>';
      html += '<option value="Tarjeta">Tarjeta</option>';
      html += '</select>';
      html += '<button class="caja-btn caja-btn-primary caja-btn-block" onclick="confirmarCobroPedido(\'' + c.id + '\')">Confirmar Pago y Cerrar</button>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }).join("");
}

function confirmarCobroPedido(id) {
  const selectEl = document.getElementById('pago-real-' + id);
  const nuevoMedioPago = selectEl ? selectEl.value : "";

  if (!nuevoMedioPago) {
    alert("Por favor seleccioná con qué medio pagó el cliente antes de confirmar.");
    return;
  }

  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === id; });
  if (!c) return;

  // Actualizamos los datos del pago
  c.pago = nuevoMedioPago;
  c.estadoPago = "cobrado";

  // Registramos formalmente el ingreso en la caja con el pago definitivo
  const totalCalculado = c.items.reduce(function(acc, it) { return acc + (it.precio * it.cantidad); }, 0);
  cajaRegistrarVentaDesdePedido({
    pago: c.pago,
    tipoEntrega: c.tipoEntrega,
    total: totalCalculado,
    nombre: c.nombre,
    ledger: c.ledger || "principal",
    items: c.items
  });

  // Guardamos los cambios en el almacenamiento de comandas
  comandasSave(data);

  // Refrescamos la vista de la pantalla
  renderPendientesPago();
}

document.addEventListener("DOMContentLoaded", function () {
  cajaAplicarTema();
  cajaInitNavDropdown();
  renderPendientesPago();
  setInterval(renderPendientesPago, 5000);
});
