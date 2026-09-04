
/* =========================================================
   MYCFOODS · CAJA CORE
   Funciones compartidas de almacenamiento y cálculo.
   Incluir este script antes que los demás en:
   index.html (pedidos / salón) y caja.html (administración).
========================================================= */

const CAJA_STORAGE_KEY = "mycfoods_caja_v1";

const CAJA_METHODS = [
  "Efectivo",
  "Transferencia",
  "Tarjeta de Débito / Crédito",
  "QR / Mercado Pago",
  "Otro"
];

const CAJA_INCOME_CATS = [
  "Ventas delivery",
  "Ventas take away",
  "Ventas salón",
  "Eventos",
  "Otros ingresos"
];

const CAJA_EXPENSE_CATS = [
  "Mercadería e insumos",
  "Sueldos y cargas sociales",
  "Alquiler",
  "Servicios (luz/agua/gas)",
  "Mantenimiento",
  "Marketing",
  "Impuestos",
  "Otros gastos"
];

/* =========================================================
   MAPEO DE ENTREGA → CATEGORÍA DE CAJA
========================================================= */

const CAJA_ENTREGA_TO_CATEGORY = {
  "Delivery (Tigre Centro)": "Ventas delivery",
  "Retiro por local (Luis Pereyra 440)": "Ventas take away",
};

/* =========================================================
   VALORES INICIALES
========================================================= */

function cajaDefaults() {

  return {
    transactions: [],
    openings: {},

    config: {
      fixedCosts: [],
      variablePct: "",
      avgTicket: "",
      unit: "pedidos",
      autoTicket: true
    },

    businessName: "MYCFOODS"
  };
}

/* =========================================================
   CARGAR CAJA
========================================================= */

function cajaLoad() {

  try {

    const raw = localStorage.getItem(CAJA_STORAGE_KEY);

    if (!raw) {
      return cajaDefaults();
    }

    const parsed = JSON.parse(raw);

    const defaults = cajaDefaults();

    const merged = Object.assign(
      defaults,
      parsed
    );

    /*
      Merge profundo de config.
      Evita perder configuraciones guardadas
      si se agrega algún campo nuevo.
    */

    merged.config = Object.assign(
      defaults.config,
      parsed.config || {}
    );

    if (!Array.isArray(merged.config.fixedCosts)) {
      merged.config.fixedCosts = [];
    }

    if (!Array.isArray(merged.transactions)) {
      merged.transactions = [];
    }

    if (!merged.openings) {
      merged.openings = {};
    }

    return merged;

  } catch (e) {

    console.error(
      "Error leyendo caja:",
      e
    );

    return cajaDefaults();
  }
}

/* =========================================================
   GUARDAR CAJA
========================================================= */

function cajaSave(data) {

  try {

    localStorage.setItem(
      CAJA_STORAGE_KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (e) {

    console.error(
      "Error guardando caja:",
      e
    );

    return false;
  }
}

/* =========================================================
   ID ÚNICO
========================================================= */

function cajaUid() {

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

/* =========================================================
   FECHA LOCAL
   YYYY-MM-DD
========================================================= */

function cajaTodayStr() {

  const d = new Date();

  const tz =
    d.getTimezoneOffset() * 60000;

  return new Date(
    d.getTime() - tz
  )
    .toISOString()
    .slice(0, 10);
}

/* =========================================================
   CLAVE DEL MES
========================================================= */

function cajaMonthKey(dateStr) {

  return dateStr.slice(0, 7);
}

/* =========================================================
   NOMBRE DEL MES
========================================================= */

function cajaMonthLabel(key) {

  const parts = key.split("-");

  const names = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic"
  ];

  return (
    names[
      parseInt(parts[1], 10) - 1
    ] +
    " '" +
    parts[0].slice(2)
  );
}

/* =========================================================
   FORMATO MONEDA
========================================================= */

function cajaFmtMoney(n) {

  const v = Number(n) || 0;

  const sign =
    v < 0 ? "-" : "";

  return (
    sign +
    "$" +
    Math.abs(v).toLocaleString(
      "es-AR",
      {
        maximumFractionDigits: 0
      }
    )
  );
}

/* =========================================================
   FECHA PARA MOSTRAR
========================================================= */

function cajaFmtDateLabel(dateStr) {

  const p = dateStr.split("-");

  return (
    p[2] +
    "/" +
    p[1]
  );
}

/* =========================================================
   CALCULAR SALDOS
========================================================= */

function cajaComputeBalances(
  transactions,
  openings
) {

  const dates =
    Object.keys(
      openings || {}
    ).sort();

  const today =
    cajaTodayStr();

  let baseDate = null;
  let baseP = 0;
  let baseC = 0;

  dates.forEach(function (d) {

    if (d <= today) {

      baseDate = d;

      baseP =
        (openings[d] &&
          openings[d].principal) ||
        0;

      baseC =
        (openings[d] &&
          openings[d].chica) ||
        0;
    }
  });

  let principal = baseP;
  let chica = baseC;

  transactions.forEach(function (m) {

    if (
      baseDate &&
      m.date < baseDate
    ) {
      return;
    }

    const v =
      m.type === "ingreso"
        ? m.amount
        : -m.amount;

    if (
      m.ledger === "principal"
    ) {
      principal += v;
    } else {
      chica += v;
    }
  });

  return {
    principal: principal,
    chica: chica,
    baseDate: baseDate
  };
}

/* =========================================================
   AGREGAR MOVIMIENTO
========================================================= */

function cajaAddTransaction(tx) {

  const data =
    cajaLoad();

  data.transactions.push(
    Object.assign(
      {
        id: cajaUid()
      },
      tx
    )
  );

  cajaSave(data);

  return data;
}

/* =========================================================
   REGISTRAR VENTA DESDE PEDIDOS
=========================================================

   Se llama desde index.html cuando se confirma
   e imprime un pedido normal.
========================================================= */

function cajaRegistrarVentaDesdePedido(opts) {

  const categoria =
    CAJA_ENTREGA_TO_CATEGORY[
      opts.tipoEntrega
    ] ||
    "Otros ingresos";

  cajaAddTransaction({

    type: "ingreso",

    ledger:
      opts.ledger ||
      "principal",

    date:
      cajaTodayStr(),

    category:
      categoria,

    method:
      opts.pago,

    amount:
      Number(opts.total) || 0,

    note:
      "Pedido: " +
      opts.nombre
  });
}

/* =========================================================
   REGISTRAR VENTA SALÓN
=========================================================

   Esta función es independiente de PEDIDOS.

   Las ventas realizadas desde el carrito rápido
   SALÓN se registran automáticamente en Caja como:

   Categoría:
   Ventas salón

   Nota:
   Venta SALÓN
========================================================= */

function cajaRegistrarVentaSalon(opts) {

  cajaAddTransaction({

    type: "ingreso",

    ledger:
      opts.ledger ||
      "principal",

    date:
      cajaTodayStr(),

    category:
      "Ventas salón",

    method:
      opts.pago ||
      "Efectivo",

    amount:
      Number(opts.total) || 0,

    note:
      "Venta SALÓN"
  });
}
```
