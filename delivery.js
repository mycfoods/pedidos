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
   CALCULAR TOTAL ACTUAL DEL PEDIDO
   Suma siempre los items que tenga la comanda en ese momento.
========================================================= */
function calcularTotalPendiente(c) {
  if (!c || !Array.isArray(c.items)) return 0;

  return c.items.reduce(function (total, it) {
    return total + (
      (Number(it.precio) || 0) *
      (Number(it.cantidad) || 0)
    );
  }, 0);
}


/* =========================================================
   FORMATO DE DINERO
========================================================= */
function formatearDineroPendiente(valor) {
  return "$" + Number(valor || 0).toLocaleString("es-AR");
}


/* =========================================================
   RENDER PENDIENTES
   SE MANTIENE LA LÓGICA ORIGINAL.
========================================================= */
function renderPendientesPago() {

  const data = comandasLoad();
  const today = cajaTodayStr();

  // Productos disponibles del menú
  const menuData =
    typeof menuLoad === "function"
      ? menuLoad()
      : { products: [] };

  const productosDisponibles = menuData.products || [];

  // IMPORTANTE:
  // Se mantiene exactamente el filtro original.
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

    const estadoPago =
      c.estadoPago ||
      (c.pago === "pendiente" ? "pendiente" : "cobrado");

    const totalActual = calcularTotalPendiente(c);

    let html = '<div class="caja-card">';


    /* =====================================================
       CABECERA
    ===================================================== */

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


    /* =====================================================
       DATOS DEL PEDIDO
    ===================================================== */

    html +=
      '<div class="stat-sub" style="margin-bottom:8px;">' +
      '🕐 ' + escapeHtml(c.hora || "") +
      ' &middot; 👤 ' + escapeHtml(c.nombre || "Cliente") +
      ' &middot; 💳 <i>' + escapeHtml(c.pago || "") + '</i>' +
      '</div>';


    /* =====================================================
       ITEMS
    ===================================================== */

    if (Array.isArray(c.items)) {

      c.items.forEach(function (it, itIndex) {

        const subtotalItem =
          (Number(it.precio) || 0) *
          (Number(it.cantidad) || 0);

        html +=
          '<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid #f2f2f2;">';

        html +=
          '<span style="font-size:0.85rem; flex:1;">' +
          escapeHtml(it.cantidad) +
          ' x ' +
          escapeHtml(it.nombre) +
          ' <b style="color:#333;">' +
          formatearDineroPendiente(subtotalItem) +
          '</b>' +
          '</span>';


        /* BOTONES + / - */

        if (estadoPago === "pendiente") {

          html +=
            '<div style="display:flex; align-items:center; gap:4px; margin-left:8px;">';

          html +=
            '<button type="button" class="caja-btn" ' +
            'style="padding:2px 9px; font-size:0.8rem; min-width:30px;" ' +
            'onclick="modificarCantidadItemPendiente(\'' +
            c.id +
            '\', ' +
            itIndex +
            ', -1)">−</button>';

          html +=
            '<span style="font-size:0.85rem; font-weight:bold; min-width:18px; text-align:center;">' +
            it.cantidad +
            '</span>';

          html +=
            '<button type="button" class="caja-btn" ' +
            'style="padding:2px 9px; font-size:0.8rem; min-width:30px;" ' +
            'onclick="modificarCantidadItemPendiente(\'' +
            c.id +
            '\', ' +
            itIndex +
            ', 1)">+</button>';

          html += '</div>';
        }

        html += '</div>';
      });
    }


    /* =====================================================
       TOTAL ACTUAL
    ===================================================== */

    if (estadoPago === "pendiente") {

      html +=
        '<div style="' +
        'margin-top:10px;' +
        'padding:10px 12px;' +
        'background:#f7f7f7;' +
        'border:1px solid #e5e5e5;' +
        'border-radius:8px;' +
        'display:flex;' +
        'justify-content:space-between;' +
        'align-items:center;' +
        '">';

      html +=
        '<span style="font-size:0.85rem; font-weight:700; color:#555;">TOTAL ACTUAL</span>';

      html +=
        '<strong style="font-size:1.25rem; color:#111;">' +
        formatearDineroPendiente(totalActual) +
        '</strong>';

      html += '</div>';
    }


    /* =====================================================
       NOTAS
    ===================================================== */

    if (c.notas) {

      html +=
        '<div class="stat-sub" style="margin-top:6px; font-style:italic;">"' +
        escapeHtml(c.notas) +
        '"</div>';
    }


    /* =====================================================
       EDICIÓN Y COBRO
    ===================================================== */

    if (estadoPago === "pendiente") {


      /* ===================================================
         BOTONERA DE PRODUCTOS
      =================================================== */

      html +=
        '<div style="margin-top:12px; border-top:1px dashed #ddd; padding-top:10px;">';

      html +=
        '<div style="font-size:0.78rem; font-weight:700; margin-bottom:7px; color:#555;">' +
        '➕ AGREGAR PRODUCTO' +
        '</div>';


      /*
         Los botones quedan compactos, ordenados y
         fáciles de tocar.
      */

      html +=
        '<div style="' +
        'display:grid;' +
        'grid-template-columns:repeat(auto-fit,minmax(145px,1fr));' +
        'gap:5px;' +
        'max-height:180px;' +
        'overflow-y:auto;' +
        'padding:2px;' +
        '">';


      productosDisponibles.forEach(function (p) {

        const nombreEscapado =
          String(p.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

        html +=
          '<button type="button" class="caja-btn" ' +
          'style="' +
          'font-size:0.73rem;' +
          'padding:7px 6px;' +
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
          Number(p.price || 0) +
          ')">' +

          '<span style="display:block; font-weight:700;">' +
          escapeHtml(p.name) +
          '</span>' +

          '<span style="display:block; margin-top:2px; font-size:0.68rem; color:#777;">' +
          formatearDineroPendiente(p.price) +
          '</span>' +

          '</button>';
      });


      html += '</div>';
      html += '</div>';


      /* ===================================================
         MEDIO DE PAGO REAL
      =================================================== */

      html +=
        '<div class="caja-row" style="' +
        'margin-top:12px;' +
        'gap:8px;' +
        'display:flex;' +
        'flex-direction:column;' +
        'border-top:1px solid #eee;' +
        'padding-top:10px;' +
        '">';

      html +=
        '<select id="pago-real-' +
        c.id +
        '" class="caja-input" style="width:100%;">';

      html +=
        '<option value="" disabled selected>Elegir pago real...</option>';

      html += '<option value="Efectivo">Efectivo</option>';
      html += '<option value="Transferencia">Transferencia</option>';
      html += '<option value="Tarjeta">Tarjeta</option>';
      html += '<option value="Mercado Pago">Mercado Pago</option>';

      html += '</select>';


      html +=
        '<button type="button" class="caja-btn caja-btn-primary caja-btn-block" ' +
        'onclick="confirmarCobroPedido(\'' +
        c.id +
        '\')">' +
        '💰 Cobrar ' +
        formatearDineroPendiente(totalActual) +
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

function modificarCantidadItemPendiente(idComanda, indexItem, cambio) {

  const data = comandasLoad();

  const c = data.comandas.find(function (x) {
    return x.id === idComanda;
  });

  if (!c || !c.items[indexItem]) return;


  c.items[indexItem].cantidad += cambio;


  // Si llega a 0 o menos, eliminamos el producto.
  if (c.items[indexItem].cantidad <= 0) {
    c.items.splice(indexItem, 1);
  }


  comandasSave(data);

  renderPendientesPago();
}


/* =========================================================
   AGREGAR PRODUCTO
========================================================= */

function agregarProductoPendiente(idComanda, nombreProd, precioProd) {

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


  /*
     IMPORTANTE:
     Se calcula nuevamente JUSTO al cobrar.
     Así nunca se usa el total viejo.
  */

  const totalCalculado = calcularTotalPendiente(c);


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
