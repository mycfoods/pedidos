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
  return (c.items || []).reduce(function (acc, it) {
    return acc +
      ((Number(it.precio) || 0) * (Number(it.cantidad) || 0));
  }, 0);
}


/* =========================================================
   RENDER PENDIENTES
========================================================= */

// Estado de pantalla que sobrevive a cada re-dibujado
const PEND_CAT = {};   // categoría de productos abierta por pedido
const PAGO_SEL = {};   // medio de pago elegido por pedido
let _pendHash = "";

function renderPendientesPago(soloSiCambio) {

  const data = comandasLoad();

  // El refresco automático NO redibuja si no cambió nada (evita saltos de pantalla).
  const hash = JSON.stringify(data.comandas) + cajaTodayStr();
  if (soloSiCambio && hash === _pendHash) return;
  _pendHash = hash;
  const scrollY = window.scrollY;
  const today = cajaTodayStr();

  const menuData =
    typeof menuLoad === "function"
      ? menuLoad()
      : { products: [] };

  const productosDisponibles = menuData.products || [];

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
      '<div class="caja-card empty-note">' +
      'No hay pedidos registrados hoy.' +
      '</div>';

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
       DATOS
    ===================================================== */

    html +=
      '<div class="stat-sub" style="margin-bottom:10px;">' +
      '🕐 ' + c.hora +
      ' &middot; 👤 ' +
      escapeHtml(c.nombre || "Cliente") +
      ' &middot; 💳 <i>' +
      escapeHtml(c.pago) +
      '</i></div>';


    /* =====================================================
       TOTAL GRANDE Y VISIBLE
    ===================================================== */

    if (estadoPago === "pendiente") {

      html +=
        '<div style="' +
        'margin:10px 0 14px;' +
        'padding:14px 16px;' +
        'background:#111;' +
        'border:2px solid #f1a80a;' +
        'border-radius:10px;' +
        'display:flex;' +
        'justify-content:space-between;' +
        'align-items:center;' +
        '">';

      html +=
        '<span style="' +
        'font-size:0.78rem;' +
        'font-weight:800;' +
        'color:#fff;' +
        'letter-spacing:0.4px;' +
        '">' +
        'TOTAL DEL PEDIDO' +
        '</span>';

      html +=
        '<strong style="' +
        'font-size:1.45rem;' +
        'font-weight:800;' +
        'color:#f1a80a;' +
        'white-space:nowrap;' +
        '">' +
        '$' + totalActual.toLocaleString("es-AR") +
        '</strong>';

      html += '</div>';
    }


    /* =====================================================
       ITEMS
    ===================================================== */

    (c.items || []).forEach(function (it, itIndex) {

      const subtotalItem =
        (Number(it.precio) || 0) *
        (Number(it.cantidad) || 0);

      html +=
        '<div style="' +
        'display:flex;' +
        'justify-content:space-between;' +
        'align-items:center;' +
        'padding:6px 0;' +
        'border-bottom:1px solid #f2f2f2;' +
        '">';

      html +=
        '<span style="font-size:0.85rem;">' +
        it.cantidad +
        ' x ' +
        escapeHtml(it.nombre) +
        ' <b style="color:#333;">$' +
        subtotalItem.toLocaleString("es-AR") +
        '</b>' +
        '</span>';


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
          ', -1)">-</button>';

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
       CONTROLES DEL PENDIENTE
    ===================================================== */

    if (estadoPago === "pendiente") {

      /* ---------------------------------------------------
         AGREGAR PRODUCTOS
         MISMO ESTILO DEL MENÚ PRINCIPAL
      --------------------------------------------------- */

      html +=
        '<div style="' +
        'margin-top:14px;' +
        'border-top:1px dashed #ddd;' +
        'padding-top:10px;' +
        '">';

      html +=
        '<div style="' +
        'font-size:0.78rem;' +
        'font-weight:800;' +
        'margin-bottom:8px;' +
        'color:#333;' +
        '">' +
        '➕ AGREGAR PRODUCTO' +
        '</div>';

      // Categorías como botones + productos como botones (sin lista larga)
      const categoriasMenu = [];
      productosDisponibles.forEach(function (p) {
        if (categoriasMenu.indexOf(p.category) === -1) categoriasMenu.push(p.category);
      });
      if (!PEND_CAT[c.id] || categoriasMenu.indexOf(PEND_CAT[c.id]) === -1) {
        PEND_CAT[c.id] = categoriasMenu[0];
      }

      html += '<div class="pendiente-cats">';
      categoriasMenu.forEach(function (cat, ci) {
        html +=
          '<button type="button" class="pendiente-cat-btn' + (PEND_CAT[c.id] === cat ? ' active' : '') + '" ' +
          'onclick="cambiarCategoriaPendiente(\'' + c.id + '\', ' + ci + ')">' +
          escapeHtml(cat) + '</button>';
      });
      html += '</div>';

      html += '<div class="pendiente-grid">';
      productosDisponibles
        .filter(function (p) { return p.category === PEND_CAT[c.id]; })
        .forEach(function (p) {
          html +=
            '<button type="button" class="pendiente-prod-btn" ' +
            'onclick="agregarProductoPendientePorId(\'' + c.id + '\', \'' + p.id + '\')">' +
            '<span class="pendiente-prod-nombre">' + escapeHtml(p.name) + '</span>' +
            '<span class="pendiente-prod-precio">$' + Number(p.price).toLocaleString("es-AR") + '</span>' +
            '</button>';
        });
      html += '</div>';
      html += '</div>';


      /* ---------------------------------------------------
         PAGO REAL
      --------------------------------------------------- */

      html +=
        '<div class="caja-row" ' +
        'style="' +
        'margin-top:12px;' +
        'gap:8px;' +
        'display:flex;' +
        'flex-direction:column;' +
        'border-top:1px solid #eee;' +
        'padding-top:8px;' +
        '">';


      /* ---------------------------------------------------
         BOTONES DE MEDIO DE PAGO
      --------------------------------------------------- */

      html +=
        '<div id="pago-real-' + c.id + '" ' +
        'class="pendiente-pagos">';

      html +=
        '<button type="button" ' +
        'class="pendiente-pago-btn" ' +
        'data-pago="Efectivo" ' +
        'onclick="seleccionarPagoPendiente(\'' +
        c.id +
        '\', \'Efectivo\', this)">' +
        '💵 EFECTIVO' +
        '</button>';

      html +=
        '<button type="button" ' +
        'class="pendiente-pago-btn" ' +
        'data-pago="Transferencia" ' +
        'onclick="seleccionarPagoPendiente(\'' +
        c.id +
        '\', \'Transferencia\', this)">' +
        '🏦 TRANSFERENCIA' +
        '</button>';

      html +=
        '<button type="button" ' +
        'class="pendiente-pago-btn" ' +
        'data-pago="Tarjeta" ' +
        'onclick="seleccionarPagoPendiente(\'' +
        c.id +
        '\', \'Tarjeta\', this)">' +
        '💳 TARJETA' +
        '</button>';

      html += '</div>';


      /* ---------------------------------------------------
         BOTON COBRAR
      --------------------------------------------------- */

      html +=
        '<button type="button" ' +
        'class="caja-btn caja-btn-primary caja-btn-block" ' +
        'onclick="confirmarCobroPedido(\'' +
        c.id +
        '\')">' +
        'Cobrar $' +
        totalActual.toLocaleString("es-AR") +
        ' y Cerrar' +
        '</button>';

      html += '</div>';
    }


    html += '</div>';

    return html;

  }).join("");

  Object.keys(PAGO_SEL).forEach(function (id) {
    const cont = document.getElementById("pago-real-" + id);
    if (!cont) return;
    const btn = cont.querySelector('.pendiente-pago-btn[data-pago="' + PAGO_SEL[id] + '"]');
    if (btn) { btn.classList.add("active"); cont.dataset.pagoSeleccionado = PAGO_SEL[id]; }
  });
  window.scrollTo(0, scrollY);
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

  if (c.items[indexItem].cantidad <= 0) {
    c.items.splice(indexItem, 1);
  }

  comandasSave(data);

  renderPendientesPago();
}


/* =========================================================
   AGREGAR PRODUCTO
========================================================= */

function cambiarCategoriaPendiente(idComanda, indice) {
  const cats = [];
  (menuLoad().products || []).forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
  PEND_CAT[idComanda] = cats[indice];
  renderPendientesPago();
}

function agregarProductoPendientePorId(idComanda, idProd) {
  const prod = (menuLoad().products || []).find(function (p) { return p.id === idProd; });
  if (!prod) return;
  agregarProductoPendiente(idComanda, prod.name, prod.price);
}

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
   SELECCIONAR MEDIO DE PAGO
========================================================= */

function seleccionarPagoPendiente(id, medio, boton) {

  const contenedor =
    document.getElementById("pago-real-" + id);

  if (!contenedor) return;

  const botones =
    contenedor.querySelectorAll(".pendiente-pago-btn");

  botones.forEach(function (btn) {
    btn.classList.remove("active");
  });

  boton.classList.add("active");

  contenedor.dataset.pagoSeleccionado = medio;
  PAGO_SEL[id] = medio;
}


/* =========================================================
   CONFIRMAR COBRO
========================================================= */

function confirmarCobroPedido(id) {

  const pagoEl =
    document.getElementById("pago-real-" + id);

  const nuevoMedioPago =
    pagoEl
      ? (pagoEl.dataset.pagoSeleccionado || "")
      : "";

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

  delete PAGO_SEL[id];
  c.pago = nuevoMedioPago;
  c.estadoPago = "cobrado";

  const totalCalculado = c.items.reduce(function (acc, it) {
    return acc +
      ((Number(it.precio) || 0) * (Number(it.cantidad) || 0));
  }, 0);

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

  setInterval(function () { renderPendientesPago(true); }, 5000);

});
