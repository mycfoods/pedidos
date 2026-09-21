/* =========================================================
   MYCFOODS · PENDIENTES DE PAGO — gestión, cobro y edición
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
  
  // Cargamos los productos del menú para los botones rápidos
  const menuData = typeof menuLoad === 'function' ? menuLoad() : { products: [] };
  const productosDisponibles = menuData.products || [];

  // Filtramos los pedidos del día
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
    html += '<div class="stat-sub" style="margin-bottom:8px;">🕐 ' + c.hora + ' &middot; 👤 ' + escapeHtml(c.nombre || "Cliente") + ' &middot; 💳 <i>' + escapeHtml(c.pago) + '</i></div>';
    
    // Items del pedido con botones para modificar o eliminar si está pendiente
    c.items.forEach(function (it, itIndex) {
      const subtotalItem = it.precio * it.cantidad;
      html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f2f2f2;">';
      html += '<span style="font-size:0.85rem;">' + it.cantidad + ' x ' + escapeHtml(it.nombre) + ' <b style="color:#333;">$' + subtotalItem.toLocaleString("es-AR") + '</b></span>';
      
      if (estadoPago === "pendiente") {
        html += '<div style="display:flex; align-items:center; gap:4px;">';
        html += '<button type="button" class="caja-btn" style="padding:2px 8px; font-size:0.8rem;" onclick="modificarCantidadItemPendiente(\'' + c.id + '\', ' + itIndex + ', -1)">-</button>';
        html += '<span style="font-size:0.85rem; font-weight:bold; padding:0 4px;">' + it.cantidad + '</span>';
        html += '<button type="button" class="caja-btn" style="padding:2px 8px; font-size:0.8rem;" onclick="modificarCantidadItemPendiente(\'' + c.id + '\', ' + itIndex + ', 1)">+</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    
    if (c.notas) html += '<div class="stat-sub" style="margin-top:6px; font-style:italic;">"' + escapeHtml(c.notas) + '"</div>';

    // Si el pago está pendiente, mostramos los botones rápidos de productos y el cierre de cobro
    if (estadoPago === "pendiente") {
      
      // Botones rápidos para agregar productos al toque
      html += '<div style="margin-top:10px; border-top:1px dashed #ddd; padding-top:8px;">';
      html += '<div style="font-size:0.75rem; font-weight:700; margin-bottom:6px; color:#555;">➕ Tocá para agregar al pedido:</div>';
      html += '<div style="display:flex; flex-wrap:wrap; gap:4px; max-height:130px; overflow-y:auto; padding-bottom:4px;">';
      
      productosDisponibles.forEach(function(p) {
        const nombreEscapado = p.name.replace(/'/g, "\\'");
        html += '<button type="button" class="caja-btn" style="font-size:0.75rem; padding:4px 8px; background:#f8f9fa; color:#333; border:1px solid #ccc; cursor:pointer;" onclick="agregarProductoPendiente(\'' + c.id + '\', \'' + nombreEscapado + '\', ' + p.price + ')">' + escapeHtml(p.name) + ' ($' + p.price + ')</button>';
      });
      
      html += '</div>';
      html += '</div>';

      // Selector de pago real y botón de cierre
      html += '<div class="caja-row" style="margin-top:12px; gap:8px; display:flex; flex-direction:column; border-top:1px solid #eee; padding-top:8px;">';
      html += '<select id="pago-real-' + c.id + '" class="caja-input" style="width:100%;">';
      html += '<option value="" disabled selected>Elegir pago real (Efectivo / Transferencia)...</option>';
      html += '<option value="Efectivo">Efectivo</option>';
      html += '<option value="Transferencia">Transferencia</option>';
      html += '<option value="Tarjeta">Tarjeta</option>';
      html += '</select>';
      html += '<button type="button" class="caja-btn caja-btn-primary caja-btn-block" onclick="confirmarCobroPedido(\'' + c.id + '\')">Confirmar Pago y Cerrar</button>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }).join("");
}

function modificarCantidadItemPendiente(idComanda, indexItem, cambio) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === idComanda; });
  if (!c || !c.items[indexItem]) return;

  c.items[indexItem].cantidad += cambio;

  // Si llega a 0 o menos, lo removemos del pedido
  if (c.items[indexItem].cantidad <= 0) {
    c.items.splice(indexItem, 1);
  }

  comandasSave(data);
  renderPendientesPago();
}

function agregarProductoPendiente(idComanda, nombreProd, precioProd) {
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === idComanda; });
  if (!c) return;

  const itemExistente = c.items.find(function (it) { return it.nombre === nombreProd; });
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    c.items.push({
      nombre: nombreProd,
      precio: Number(precioProd),
      cantidad: 1
    });
  }

  comandasSave(data);
  renderPendientesPago();
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

  c.pago = nuevoMedioPago;
  c.estadoPago = "cobrado";

  const totalCalculado = c.items.reduce(function(acc, it) { return acc + (it.precio * it.cantidad); }, 0);
  cajaRegistrarVentaDesdePedido({
    pago: c.pago,
    tipoEntrega: c.tipoEntrega,
    total: totalCalculado,
    nombre: c.nombre,
    ledger: c.ledger || "principal",
    items: c.items
  });

  comandasSave(data);
  renderPendientesPago();
}

document.addEventListener("DOMContentLoaded", function () {
  cajaAplicarTema();
  cajaInitNavDropdown();
  renderPendientesPago();
  setInterval(renderPendientesPago, 5000);
});
