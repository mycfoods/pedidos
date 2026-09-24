/* =========================================================
   MYCFOODS · PENDIENTES DE PAGO — gestión, cobro y edición
   Requiere caja-core.js cargado antes.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c];
  });
}

const PAGO_LABELS = {
  pendiente: "⏳ Pago Pendiente",
  cobrado: "✅ Pagado"
};

const PAGO_COLOR = {
  pendiente: "#e2564a",
  cobrado: "#5fa372"
};


/* =========================================================
   TOTAL ACTUAL DEL PEDIDO
========================================================= */

function calcularTotalPendiente(c) {
  if (!c || !Array.isArray(c.items)) return 0;

  return c.items.reduce(function (total, it) {
    return total +
      ((Number(it.precio) || 0) * (Number(it.cantidad) || 0));
  }, 0);
}


/* =========================================================
   RENDER PENDIENTES DE PAGO

   IMPORTANTE:
   La lógica original de recepción de pedidos se mantiene.
========================================================= */

function renderPendientesPago() {

  const data = comandasLoad();
  const today = cajaTodayStr();

  // Cargamos los productos del menú para los botones rápidos
  const menuData =
    typeof menuLoad === "function"
      ? menuLoad()
      : { products: [] };

  const productosDisponibles = menuData.products || [];


  // =======================================================
  // FILTRADO ORIGINAL — NO MODIFICADO
  // =======================================================

  const lista = data.comandas
    .filter(function (c) {
      return c.fecha === today;
    })
    .sort(function (a, b) {
      return a.hora < b.hora ? 1 : -1;
    });


  const cont = document.getElementById("delivery-list");

  if (!cont) return;


  if (lista.length === 0) {

    cont.innerHTML =
      '<div class="caja-card empty-note">No hay pedidos registrados hoy.</div>';

    return;
  }


  cont.innerHTML = lista.map(function (c) {

    // =====================================================
    // ESTADO ORIGINAL — NO MODIFICADO
    // =====================================================

    const estadoPago =
      c.estadoPago ||
      (c.pago === "pendiente" ? "pendiente" : "cobrado");


    // Total actual del pedido
    const totalActual = calcularTotalPendiente(c);


    let html = '<div class="caja-card">';


    // =====================================================
    // CABECERA
    // =====================================================

    html +=
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">';

    html +=
      '<span style="font-weight:700; font-size:0.95rem;">' +
      escapeHtml(c.referencia || c.nombre) +
      '</span>';

    html +=
      '<span style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:20px; color:' +
      PAGO_COLOR[estadoPago] +
      '; border:1px solid ' +
      PAGO_COLOR[estadoPago] +
      ';">' +
      PAGO_LABELS[estadoPago] +
      '</span>';

    html += '</div>';


    // =====================================================
    // DATOS DEL PEDIDO
    // =====================================================

    html +=
      '<div class="stat-sub" style="margin-bottom:8px;">' +
      '🕐 ' +
      c.hora +
      ' &middot; 👤 ' +
      escapeHtml(c.nombre || "Cliente") +
      ' &middot; 💳 <i>' +
      escapeHtml(c.pago) +
      '</i>' +
      '</div>';


    // =====================================================
    // PRODUCTOS DEL PEDIDO
    // =====================================================

    c.items.forEach(function (it, itIndex) {

      const subtotalItem =
        it.precio * it.cantidad;


      html +=
        '<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f2f2f2;">';


      html +=
        '<span style="font-size:0.85rem;">' +
        it.cantidad +
        ' x ' +
        escapeHtml(it.nombre) +
        ' <b style="color:#333;">$' +
        subtotalItem.toLocaleString("es-AR") +
        '</b>' +
        '</span>';


      // ===================================================
      // BOTONES + / -
      // ===================================================

      if (estadoPago === "pendiente") {

        html +=
          '<div style="display:flex; align-items:center; gap:4px;">';

        html +=
          '<button type="button" class="caja-btn" ' +
          'style="padding:2px 8px; font-size:0.8rem;" ' +
          'onclick="modificarCantidadItemPendiente(\'' +
          c.id +
          '\', ' +
          itIndex +
          ', -1)">−</button>';

        html +=
          '<span style="font-size:0.85rem; font-weight:bold; padding:0 4px;">' +
          it.cantidad +
          '</span>';

        html +=
          '<button type="button" class="caja-btn" ' +
          'style="padding:2px 8px; font-size:0.8rem;" ' +
          'onclick="modificarCantidadItemPendiente(\'' +
          c.id +
          '\', ' +
          itIndex +
          ', 1)">+</button>';

        html += '</div>';
      }


      html += '</div>';
    });


    // =====================================================
    // TOTAL ACTUAL
    // =====================================================

    if (estadoPago === "pendiente") {

      html +=
        '<div style="' +
        'display:flex;' +
        'justify-content:space-between;' +
        'align-items:center;' +
        'margin-top:10px;' +
        'padding:10px 12px;' +
        'background:#f7f7f7;' +
        'border:1px solid #e1e1e1;' +
        'border-radius:8px;' +
        '">';

      html +=
        '<span style="font-size:0.8rem; font-weight:800; color:#555;">' +
        'TOTAL ACTUAL' +
        '</span>';

      html +=
        '<strong style="font-size:1.25rem; color:#111;">$' +
        totalActual.toLocaleString("es-AR") +
        '</strong>';

      html += '</div>';
    }


    // =====================================================
    // NOTAS
    // =====================================================

    if (c.notas) {

      html +=
        '<div class="stat-sub" style="margin-top:6px; font-style:italic;">"' +
        escapeHtml(c.notas) +
        '"</div>';
    }


    // =====================================================
    // EDICIÓN DEL PEDIDO + COBRO
    // =====================================================

    if (estadoPago === "pendiente") {


      // ===================================================
      // BOTONERA DE PRODUCTOS
      // ===================================================

      html +=
        '<div style="margin-top:10px; border-top:1px dashed #ddd; padding-top:8px;">';

      html +=
        '<div style="font-size:0.75rem; font-weight:700; margin-bottom:7px; color:#555;">' +
        '➕ Agregar al pedido' +
        '</div>';


      /*
         Grid compacto.
         No cambia la lógica de agregar productos.
      */

      html +=
        '<div style="' +
        'display:grid;' +
        'grid-template-columns:repeat(auto-fit,minmax(140px,1fr));' +
        'gap:5px;' +
        'max-height:180px;' +
        'overflow-y:auto;' +
        'padding-bottom:4px;' +
        '">';


      productosDisponibles.forEach(function (p) {

        const nombreEscapado =
          String(p.name || "")
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'");


        html +=
          '<button type="button" class="caja-btn" ' +
          'style="' +
          'font-size:0.73rem;' +
          'padding:6px 7px;' +
          'background:#f8f9fa;' +
          'color:#333;' +
          'border:1px solid #ccc;' +
          'cursor:pointer;' +
          'text-align:left;' +
          'line-height:1.15;' +
          '" ' +
          'onclick="agregarProductoPendiente(\'' +
          c.id +
          '\', \'' +
          nombreEscapado +
          '\', ' +
          p.price +
          ')">';

        html +=
          '<span style="display:block; font-weight:700;">' +
          escapeHtml(p.name) +
          '</span>';

        html +=
          '<span style="display:block; margin-top:2px; font-size:0.68rem; color:#777;">$' +
          Number(p.price || 0).toLocaleString("es-AR") +
          '</span>';

        html += '</button>';
      });


      html += '</div>';
      html += '</div>';


      // ===================================================
      // MEDIO DE PAGO REAL
      // ===================================================

      html +=
        '<div class="caja-row" style="' +
        'margin-top:12px;' +
        'gap:8px;' +
        'display:flex;' +
        'flex-direction:column;' +
        'border-top:1px solid #eee;' +
        'padding-top:8px;' +
        '">';


      html +=
        '<select id="pago-real-' +
        c.id +
        '" class="caja-input" style="width:100%;">';

      html +=
        '<option value="" disabled selected>' +
        'Elegir pago real...' +
        '</option>';

      html +=
        '<option value="Efectivo">Efectivo</option>';

      html +=
        '<option value="Transferencia">Transferencia</option>';

      html +=
        '<option value="Tarjeta">Tarjeta</option>';

      html += '</select>';


      // ===================================================
      // BOTÓN DE COBRO
      // ===================================================

      html +=
        '<button type="button" class="caja-btn caja-btn-primary caja-btn-block" ' +
        'onclick="confirmarCobroPedido(\'' +
        c.id +
        '\')">' +
        '💰 Cobrar $' +
        totalActual.toLocaleString("es-AR") +
        '</button>';


      html += '</div>';
    }


    html += '</div>';

    return html;

  }).join("");
}


/* =========================================================
   MODIFICAR CANTIDAD
========================================================= */

function modificarCantidadItemPendiente(
  idComanda,
  indexItem,
  cambio
) {

  const data = comandasLoad();

  const c = data.comandas.find(function (x) {
    return x.id === idComanda;
  });

  if (!c || !c.items[indexItem]) return;


  c.items[indexItem].cantidad += cambio;


  // Si llega a 0 o menos, lo removemos del pedido
  if (c.items[indexItem].cantidad <= 0) {
    c.items.splice(indexItem, 1);
  }


  comandasSave(data);

  renderPendientesPago();
}


/* =========================================================
   AGREGAR PRODUCTO
========================================================= */

function agregarProductoPendiente(
  idComanda,
  nombreProd,
  precioProd
) {

  const data = comandasLoad();

  const c = data.comandas.find(function (x) {
    return x.id === idComanda;
  });

  if (!c) return;


  const itemExistente = c.items.find(function (it) {
    return it.nombre === nombreProd;
  });


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


/* =========================================================
   CONFIRMAR COBRO
========================================================= */

function confirmarCobroPedido(id) {

  const selectEl =
    document.getElementById("pago-real-" + id);

  const nuevoMedioPago =
    selectEl ? selectEl.value : "";


  if (!nuevoMedioPago) {

    alert(
      "Por favor seleccioná con qué medio pagó el cliente antes de confirmar."
    );

    return;
  }


  const data = comandasLoad();

  const c = data.comandas.find(function (x) {
    return x.id === id;
  });

  if (!c) return;


  // =====================================================
  // IMPORTANTE:
  // Se vuelve a calcular el total EN ESTE MOMENTO.
  // Incluye cualquier producto agregado o modificado.
  // =====================================================

  const totalCalculado =
    c.items.reduce(function (acc, it) {
      return acc +
        ((Number(it.precio) || 0) *
         (Number(it.cantidad) || 0));
    }, 0);


  c.pago = nuevoMedioPago;

  c.estadoPago = "cobrado";


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


/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  cajaAplicarTema();

  cajaInitNavDropdown();

  renderPendientesPago();

  setInterval(renderPendientesPago, 5000);

});
```
