
/* =========================================================
   MYCFOODS · PENDIENTES DE PAGO
   Gestión, edición, total en vivo y cobro
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


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PAGO_LABELS = {
  pendiente: "⏳ Pago Pendiente",
  cobrado: "✅ Pagado"
};

const PAGO_COLOR = {
  pendiente: "#e2564a",
  cobrado: "#5fa372"
};


/* =========================================================
   ESTADO DE CATEGORÍA POR PEDIDO
========================================================= */

const categoriasPendientes = {};


/* =========================================================
   FORMATEAR DINERO
========================================================= */

function formatearDinero(valor) {

  return "$" +
    Number(valor || 0).toLocaleString("es-AR");

}


/* =========================================================
   CALCULAR TOTAL DEL PEDIDO
========================================================= */

function calcularTotalPedido(c) {

  if (!c || !Array.isArray(c.items)) {
    return 0;
  }

  return c.items.reduce(function (total, item) {

    return total +
      (
        Number(item.precio) || 0
      ) *
      (
        Number(item.cantidad) || 0
      );

  }, 0);

}


/* =========================================================
   RENDER PRINCIPAL
========================================================= */

function renderPendientesPago() {

  const data =
    comandasLoad();

  const today =
    cajaTodayStr();

  const menuData =
    typeof menuLoad === "function"
      ? menuLoad()
      : { products: [] };

  const productosDisponibles =
    Array.isArray(menuData.products)
      ? menuData.products
      : [];


  const lista =
    data.comandas
      .filter(function (c) {

        return c.fecha === today;

      })
      .sort(function (a, b) {

        return a.hora < b.hora
          ? 1
          : -1;

      });


  const cont =
    document.getElementById(
      "delivery-list"
    );


  if (!cont) {
    return;
  }


  if (lista.length === 0) {

    cont.innerHTML =
      '<div class="caja-card empty-note">' +
      'No hay pedidos registrados hoy.' +
      '</div>';

    return;

  }


  cont.innerHTML =
    lista.map(function (c) {

      return renderPedidoPendiente(
        c,
        productosDisponibles
      );

    }).join("");

}


/* =========================================================
   RENDER DE UN PEDIDO
========================================================= */

function renderPedidoPendiente(
  c,
  productosDisponibles
) {

  const estadoPago =
    c.estadoPago ||
    (
      c.pago === "pendiente"
        ? "pendiente"
        : "cobrado"
    );


  let html =
    '<div class="caja-card" ' +
    'style="margin-bottom:14px;">';


  /* -------------------------------------------------------
     CABECERA
  ------------------------------------------------------- */

  html +=
    '<div style="' +
    'display:flex;' +
    'justify-content:space-between;' +
    'align-items:center;' +
    'gap:10px;' +
    'margin-bottom:8px;' +
    '">';


  html +=
    '<span style="' +
    'font-weight:800;' +
    'font-size:0.98rem;' +
    '">' +
    escapeHtml(
      c.referencia || c.nombre
    ) +
    '</span>';


  html +=
    '<span style="' +
    'font-size:0.7rem;' +
    'font-weight:800;' +
    'padding:3px 10px;' +
    'border-radius:20px;' +
    'color:' +
    PAGO_COLOR[estadoPago] +
    ';' +
    'border:1px solid ' +
    PAGO_COLOR[estadoPago] +
    ';">' +
    (
      PAGO_LABELS[estadoPago] ||
      estadoPago
    ) +
    '</span>';


  html +=
    '</div>';


  /* -------------------------------------------------------
     DATOS
  ------------------------------------------------------- */

  html +=
    '<div class="stat-sub" ' +
    'style="margin-bottom:10px;">' +
    '🕐 ' +
    escapeHtml(c.hora || "") +
    ' · 👤 ' +
    escapeHtml(
      c.nombre || "Cliente"
    ) +
    ' · 💳 ' +
    '<i>' +
    escapeHtml(
      c.pago || "Pendiente"
    ) +
    '</i>' +
    '</div>';


  /* -------------------------------------------------------
     PRODUCTOS DEL PEDIDO
  ------------------------------------------------------- */

  html +=
    '<div style="' +
    'border-top:1px solid #eee;' +
    'padding-top:4px;' +
    '">';


  if (
    !Array.isArray(c.items) ||
    c.items.length === 0
  ) {

    html +=
      '<div style="' +
      'padding:10px 0;' +
      'font-size:0.85rem;' +
      'color:#888;' +
      '">' +
      'El pedido está vacío.' +
      '</div>';

  }


  else {

    c.items.forEach(
      function (it, itIndex) {

        const subtotalItem =
          (
            Number(it.precio) || 0
          ) *
          (
            Number(it.cantidad) || 0
          );


        html +=
          '<div style="' +
          'display:flex;' +
          'justify-content:space-between;' +
          'align-items:center;' +
          'gap:8px;' +
          'padding:7px 0;' +
          'border-bottom:1px solid #f1f1f1;' +
          '">';


        html +=
          '<div style="' +
          'flex:1;' +
          'min-width:0;' +
          '">';


        html +=
          '<div style="' +
          'font-size:0.84rem;' +
          'font-weight:600;' +
          '">' +
          escapeHtml(it.nombre) +
          '</div>';


        html +=
          '<div style="' +
          'font-size:0.75rem;' +
          'color:#888;' +
          'margin-top:2px;' +
          '">' +
          formatearDinero(it.precio) +
          ' c/u · ' +
          formatearDinero(subtotalItem) +
          '</div>';


        html +=
          '</div>';


        if (
          estadoPago === "pendiente"
        ) {

          html +=
            '<div style="' +
            'display:flex;' +
            'align-items:center;' +
            'gap:3px;' +
            '">';


          html +=
            '<button type="button" ' +
            'class="caja-btn" ' +
            'style="padding:3px 9px;font-size:0.8rem;" ' +
            'onclick="modificarCantidadItemPendiente(\'' +
            c.id +
            '\',' +
            itIndex +
            ',-1)">' +
            '−' +
            '</button>';


          html +=
            '<span style="' +
            'min-width:24px;' +
            'text-align:center;' +
            'font-weight:800;' +
            'font-size:0.85rem;' +
            '">' +
            it.cantidad +
            '</span>';


          html +=
            '<button type="button" ' +
            'class="caja-btn" ' +
            'style="padding:3px 9px;font-size:0.8rem;" ' +
            'onclick="modificarCantidadItemPendiente(\'' +
            c.id +
            '\',' +
            itIndex +
            ',1)">' +
            '+' +
            '</button>';


          html +=
            '</div>';

        }


        else {

          html +=
            '<span style="' +
            'font-weight:700;' +
            'font-size:0.82rem;' +
            '">' +
            'x' +
            it.cantidad +
            '</span>';

        }


        html +=
          '</div>';

      }
    );

  }


  html +=
    '</div>';


  /* -------------------------------------------------------
     NOTAS
  ------------------------------------------------------- */

  if (c.notas) {

    html +=
      '<div class="stat-sub" ' +
      'style="margin-top:7px;font-style:italic;">' +
      '"' +
      escapeHtml(c.notas) +
      '"' +
      '</div>';

  }


  /* -------------------------------------------------------
     TOTAL ACTUAL
  ------------------------------------------------------- */

  const totalActual =
    calcularTotalPedido(c);


  html +=
    '<div style="' +
    'margin-top:12px;' +
    'padding:12px 14px;' +
    'background:#0b0b0b;' +
    'border-radius:8px;' +
    'display:flex;' +
    'justify-content:space-between;' +
    'align-items:center;' +
    '">';


  html +=
    '<span style="' +
    'font-size:0.78rem;' +
    'font-weight:800;' +
    'color:#fff;' +
    '">TOTAL ACTUAL</span>';


  html +=
    '<strong style="' +
    'font-size:1.25rem;' +
    'color:#f1a80a;' +
    '">' +
    formatearDinero(totalActual) +
    '</strong>';


  html +=
    '</div>';


  /* -------------------------------------------------------
     EDICIÓN SI ESTÁ PENDIENTE
  ------------------------------------------------------- */

  if (
    estadoPago === "pendiente"
  ) {

    html +=
      renderSelectorProductos(
        c,
        productosDisponibles
      );


    /* -----------------------------------------------------
       MEDIO DE PAGO
    ----------------------------------------------------- */

    html +=
      '<div style="' +
      'margin-top:12px;' +
      'padding-top:10px;' +
      'border-top:1px solid #eee;' +
      '">';


    html +=
      '<div style="' +
      'font-size:0.75rem;' +
      'font-weight:800;' +
      'color:#555;' +
      'margin-bottom:6px;' +
      '">' +
      '💳 FORMA DE PAGO REAL' +
      '</div>';


    html +=
      '<select id="pago-real-' +
      c.id +
      '" ' +
      'class="caja-input" ' +
      'style="width:100%;">';


    html +=
      '<option value="" selected>' +
      'Seleccionar medio de pago...' +
      '</option>';


    html +=
      '<option value="Efectivo">Efectivo</option>';

    html +=
      '<option value="Transferencia">Transferencia</option>';

    html +=
      '<option value="Tarjeta">Tarjeta</option>';

    html +=
      '<option value="Mercado Pago">Mercado Pago</option>';


    html +=
      '</select>';


    html +=
      '<button type="button" ' +
      'class="caja-btn caja-btn-primary caja-btn-block" ' +
      'style="margin-top:8px;" ' +
      'onclick="confirmarCobroPedido(\'' +
      c.id +
      '\')">' +
      '💰 CONFIRMAR PAGO · ' +
      formatearDinero(totalActual) +
      '</button>';


    html +=
      '</div>';

  }


  html +=
    '</div>';


  return html;

}


/* =========================================================
   SELECTOR DE PRODUCTOS POR CATEGORÍA
========================================================= */

function renderSelectorProductos(
  c,
  productosDisponibles
) {

  const categorias =
    [];


  productosDisponibles.forEach(
    function (p) {

      if (
        p.category &&
        categorias.indexOf(
          p.category
        ) === -1
      ) {

        categorias.push(
          p.category
        );

      }

    }
  );


  if (
    !categorias.length
  ) {

    return "";

  }


  let categoriaActual =
    categoriasPendientes[c.id];


  if (
    !categoriaActual ||
    categorias.indexOf(
      categoriaActual
    ) === -1
  ) {

    categoriaActual =
      categorias[0];

    categoriasPendientes[c.id] =
      categoriaActual;

  }


  const productosCategoria =
    productosDisponibles.filter(
      function (p) {

        return p.category ===
          categoriaActual;

      }
    );


  let html =
    '<div style="' +
    'margin-top:12px;' +
    'padding-top:10px;' +
    'border-top:1px dashed #ccc;' +
    '">';


  html +=
    '<div style="' +
    'font-size:0.75rem;' +
    'font-weight:800;' +
    'color:#555;' +
    'margin-bottom:7px;' +
    '">' +
    '➕ AGREGAR AL PEDIDO' +
    '</div>';


  /* -------------------------------------------------------
     CATEGORÍAS
  ------------------------------------------------------- */

  html +=
    '<div style="' +
    'display:flex;' +
    'gap:5px;' +
    'overflow-x:auto;' +
    'padding-bottom:7px;' +
    'scrollbar-width:thin;' +
    '">';


  categorias.forEach(
    function (categoria) {

      const activa =
        categoria ===
        categoriaActual;


      html +=
        '<button type="button" ' +
        'class="caja-btn" ' +
        'style="' +
        'white-space:nowrap;' +
        'font-size:0.72rem;' +
        'padding:5px 9px;' +
        (
          activa
            ? 'background:#f1a80a;color:#111;border-color:#f1a80a;'
            : 'background:#f7f7f7;color:#333;border:1px solid #ddd;'
        ) +
        '" ' +
        'onclick="seleccionarCategoriaPendiente(\'' +
        c.id +
        '\',\'' +
        escapeJs(categoria) +
        '\')">' +
        escapeHtml(categoria) +
        '</button>';

    }
  );


  html +=
    '</div>';


  /* -------------------------------------------------------
     PRODUTOS DA CATEGORIA
  ------------------------------------------------------- */

  html +=
    '<div style="' +
    'display:grid;' +
    'grid-template-columns:repeat(2,minmax(0,1fr));' +
    'gap:5px;' +
    'max-height:190px;' +
    'overflow-y:auto;' +
    'padding-right:2px;' +
    '">';


  productosCategoria.forEach(
    function (p) {

      html +=
        '<button type="button" ' +
        'class="caja-btn" ' +
        'style="' +
        'text-align:left;' +
        'padding:7px 8px;' +
        'font-size:0.73rem;' +
        'line-height:1.2;' +
        'background:#fafafa;' +
        'color:#222;' +
        'border:1px solid #ddd;' +
        '">';


      html +=
        '<span style="display:block;font-weight:700;">' +
        escapeHtml(p.name) +
        '</span>';


      html +=
        '<span style="display:block;margin-top:3px;color:#777;">' +
        formatearDinero(p.price) +
        '</span>';


      html +=
        '</button>';

    }
  );


  html +=
    '</div>';


  html +=
    '</div>';


  /*
     Después agregamos los onclick mediante
     listeners para evitar problemas con nombres
     que tengan comillas.
  */

  setTimeout(function () {

    const contenedor =
      document.getElementById(
        "delivery-list"
      );

    if (!contenedor) return;

    const botones =
      contenedor.querySelectorAll(
        '[data-pedido-producto="' +
        c.id +
        '"]'
      );

  }, 0);


  /*
     Los botones necesitan el evento directamente.
     Para mantener este render simple usamos
     atributos data y delegación global.
  */

  return html;

}


/* =========================================================
   ESCAPE PARA JAVASCRIPT
========================================================= */

function escapeJs(s) {

  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

}


/* =========================================================
   SELECCIONAR CATEGORÍA
========================================================= */

function seleccionarCategoriaPendiente(
  idComanda,
  categoria
) {

  categoriasPendientes[idComanda] =
    categoria;

  renderPendientesPago();

}


/* =========================================================
   MODIFICAR CANTIDAD
========================================================= */

function modificarCantidadItemPendiente(
  idComanda,
  indexItem,
  cambio
) {

  const data =
    comandasLoad();


  const c =
    data.comandas.find(
      function (x) {

        return x.id ===
          idComanda;

      }
    );


  if (
    !c ||
    !c.items ||
    !c.items[indexItem]
  ) {

    return;

  }


  c.items[indexItem].cantidad +=
    cambio;


  if (
    c.items[indexItem].cantidad <= 0
  ) {

    c.items.splice(
      indexItem,
      1
    );

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

  const data =
    comandasLoad();


  const c =
    data.comandas.find(
      function (x) {

        return x.id ===
          idComanda;

      }
    );


  if (!c) {
    return;
  }


  if (!Array.isArray(c.items)) {

    c.items = [];

  }


  const itemExistente =
    c.items.find(
      function (it) {

        return it.nombre ===
          nombreProd;

      }
    );


  if (itemExistente) {

    itemExistente.cantidad +=
      1;

  }

  else {

    c.items.push({

      nombre:
        nombreProd,

      precio:
        Number(precioProd),

      cantidad:
        1

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
    document.getElementById(
      "pago-real-" + id
    );


  const nuevoMedioPago =
    selectEl
      ? selectEl.value
      : "";


  if (!nuevoMedioPago) {

    alert(
      "Por favor seleccioná con qué medio pagó el cliente antes de confirmar."
    );

    return;

  }


  const data =
    comandasLoad();


  const c =
    data.comandas.find(
      function (x) {

        return x.id ===
          id;

      }
    );


  if (!c) {
    return;
  }


  const totalCalculado =
    calcularTotalPedido(c);


  const confirmar =
    confirm(
      "Confirmar cobro por " +
      formatearDinero(
        totalCalculado
      ) +
      " con " +
      nuevoMedioPago +
      "?"
    );


  if (!confirmar) {
    return;
  }


  c.pago =
    nuevoMedioPago;

  c.estadoPago =
    "cobrado";


  cajaRegistrarVentaDesdePedido({

    pago:
      c.pago,

    tipoEntrega:
      c.tipoEntrega,

    total:
      totalCalculado,

    nombre:
      c.nombre,

    ledger:
      c.ledger ||
      "principal",

    items:
      c.items

  });


  comandasSave(data);


  delete categoriasPendientes[id];


  renderPendientesPago();

}


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    cajaAplicarTema();

    cajaInitNavDropdown();

    renderPendientesPago();

  }
);
```
