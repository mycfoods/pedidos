/* =========================================================
   MYCFOODS · CAJA CORE
   Funciones compartidas de almacenamiento y cálculo.
   Incluir este script (antes que los demás) en cualquier
   página que necesite leer o escribir la caja:
   index.html (pedidos) y caja.html (administración).
========================================================= */

const CAJA_STORAGE_KEY = "mycfoods_caja_v1";

const CAJA_METHODS = ["Efectivo", "Transferencia", "Tarjeta de Débito / Crédito", "QR / Mercado Pago", "Otro"];

/* =========================================================
   AJUSTES DEL SITIO — editables desde caja.html > Ajustes,
   se aplican solos en index.html sin tocar código.
========================================================= */
const SITE_STORAGE_KEY = "mycfoods_site_v1";

function siteDefaults() {
  return {
    heroSubtitulo: "NUESTRA CARTA",
    heroTitulo: "Menú",
    heroBajada: "Elegí y armá tu pedido",
    entregaDeliveryLabel: "Delivery (Tigre Centro)",
    entregaRetiroLabel: "Retiro por local (Luis Pereyra 440)",
    horarioMin: "09:00",
    horarioMax: "20:00",
    metodosPago: ["Efectivo", "Tarjeta", "Billetera Virtual (Mercado Pago/QR)", "Transferencia"],
    whatsapp: "",
    // Datos del negocio
    cuit: "",
    direccion: "",
    telefono: "",
    // Parámetros comerciales
    costoDelivery: 0,
    cubiertoSalon: 0,
    descuentoEfectivoPct: 0,
    // Seguridad
    pinAdmin: "",
    anulacionSoloConPin: true,
    // Impresoras (informativo, para referencia del local)
    impresoraCocina: "",
    impresoraCaja: "",
    // Apariencia (tema visual de todas las páginas)
    colorFondo: "#0b0b0b",
    colorTarjeta: "#141414",
    colorAcento: "#f1a80a",
    colorTexto: "#ffffff",
    colorTextoSecundario: "#a0a0a0",
    colorBorde: "#262626",
    fuente: "Montserrat",
    tamanoBase: "100",
    // Qué secciones aparecen en el menú de navegación
    seccionesActivas: {
      pedidos: true, salon: true, cocina: true, caja: true,
      delivery: true, stock: true, empleados: true, ranking: true, config: true,
    },
  };
}

/* =========================================================
   APARIENCIA — aplica el tema guardado como variables CSS.
   Llamar una vez en cada página, apenas carga.
========================================================= */
const CAJA_FUENTES_DISPONIBLES = {
  "Montserrat": "'Montserrat', sans-serif",
  "Inter": "'Inter', sans-serif",
  "Poppins": "'Poppins', sans-serif",
  "Roboto": "'Roboto', sans-serif",
  "Playfair Display": "'Playfair Display', serif",
};

function cajaAplicarTema() {
  const site = siteLoad();
  aplicarSeccionesNav(site);
  let style = document.getElementById("tema-dinamico");
  if (!style) {
    style = document.createElement("style");
    style.id = "tema-dinamico";
    document.head.appendChild(style);
  }

  const familiaFuente = CAJA_FUENTES_DISPONIBLES[site.fuente] || CAJA_FUENTES_DISPONIBLES["Montserrat"];

  style.textContent =
    ":root {" +
    "--bg-main:" + site.colorFondo + ";" +
    "--bg-card:" + site.colorTarjeta + ";" +
    "--accent:" + site.colorAcento + ";" +
    "--text-white:" + site.colorTexto + ";" +
    "--text-gray:" + site.colorTextoSecundario + ";" +
    "--border-color:" + site.colorBorde + ";" +
    "--font-main:" + familiaFuente + ";" +
    "}" +
    "html{font-size:" + (site.tamanoBase || 100) + "%;}" +
    "body{font-family:var(--font-main);}";

  // Si la fuente elegida no es Montserrat (ya cargada por defecto), la trae de Google Fonts.
  if (site.fuente && site.fuente !== "Montserrat" && !document.getElementById("fuente-dinamica")) {
    const link = document.createElement("link");
    link.id = "fuente-dinamica";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + site.fuente.replace(/ /g, "+") + ":wght@400;600;700;800&display=swap";
    document.head.appendChild(link);
  }
}

function siteLoad() {
  try {
    const raw = localStorage.getItem(SITE_STORAGE_KEY);
    const defaults = siteDefaults();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    const merged = Object.assign(defaults, parsed);
    if (!Array.isArray(merged.metodosPago) || merged.metodosPago.length === 0) {
      merged.metodosPago = defaults.metodosPago;
    }
    return merged;
  } catch (e) {
    console.error("Error leyendo ajustes del sitio:", e);
    return siteDefaults();
  }
}

function siteSave(data) {
  try {
    localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando ajustes del sitio:", e);
    return false;
  }
}

function getMetodosPago() {
  const site = siteLoad();
  return (site.metodosPago && site.metodosPago.length) ? site.metodosPago : CAJA_METHODS;
}

const CAJA_INCOME_CATS = ["Ventas delivery", "Ventas take away", "Ventas salón", "Aportes", "Eventos", "Otros ingresos"];
const CAJA_EXPENSE_CATS = [
  "Mercadería e insumos", "Sueldos y cargas sociales", "Alquiler",
  "Servicios (luz/agua/gas)", "Mantenimiento", "Marketing", "Impuestos", "Otros gastos",
];

// Mapeo del campo "Tipo de Entrega" (código interno, value del <select>) a categoría de caja.
// Usa el código fijo, no el texto visible — así podés renombrar el cartel en Ajustes
// sin romper la categorización de ventas.
const CAJA_ENTREGA_TO_CATEGORY = {
  "Delivery": "Ventas delivery",
  "Take Away": "Ventas take away",
  "Salón": "Ventas salón",
};

function cajaEscapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* =========================================================
   MENÚ EDITABLE (productos y categorías)
   Se edita directo desde index.html, sin tocar el HTML.
========================================================= */
const MENU_STORAGE_KEY = "mycfoods_menu_v1";

function menuDefaultData() {
  return {
    products: [
      { id: "p1", category: "Wraps", name: "Wrap Ceasar", price: 14500, desc: "Pollo, mix de lechuga, aderezo ceasar y parmesano." },
      { id: "p2", category: "Menú del Día", name: "Menú del Día", price: 13500, desc: "Consultar plato del día." },
      { id: "p3", category: "Minutas", name: "Pechuga Grillé", price: 10000, desc: "Minuta sin guarnición." },
      { id: "p4", category: "Minutas", name: "Milanesa de Carne", price: 12000, desc: "Minuta sin guarnición." },
      { id: "p5", category: "Minutas", name: "Suprema de Pollo", price: 9500, desc: "Minuta sin guarnición." },
      { id: "p6", category: "Minutas", name: "Omelette de Queso", price: 8000, desc: "Minuta sin guarnición." },
      { id: "p7", category: "Minutas", name: "Tortilla de Papa", price: 9500, desc: "Minuta sin guarnición." },
      { id: "p8", category: "Adicionales", name: "Adicional Tomate", price: 2000, desc: "Porción individual (75g)." },
      { id: "p9", category: "Adicionales", name: "Adicional Zanahoria", price: 2000, desc: "Porción individual (75g)." },
      { id: "p10", category: "Adicionales", name: "Adicional Lechuga", price: 2000, desc: "Porción individual (75g)." },
      { id: "p11", category: "Adicionales", name: "Adicional Cebolla", price: 2000, desc: "Porción individual (75g)." },
      { id: "p12", category: "Adicionales", name: "Adicional Huevos Duros", price: 2000, desc: "Porción individual (75g)." },
      { id: "p13", category: "Adicionales", name: "Puré de Papa", price: 3500, desc: "Porción individual (75g)." },
      { id: "p14", category: "Adicionales", name: "Huevos Revueltos (x4)", price: 3000, desc: "Solos (x4 unidades)." },
      { id: "p15", category: "Adicionales", name: "Papas Rústicas al Horno", price: 3500, desc: "Al horno." },
      { id: "p16", category: "Adicionales", name: "Arroz Blanco", price: 3500, desc: "Porción individual (75g)." },
      { id: "p17", category: "Adicionales", name: "Puré de Kabutia", price: 3500, desc: "Porción individual (75g)." },
      { id: "p18", category: "Ensaladas", name: "Ensalada Completa", price: 12000, desc: "Mix verdes, tomate, choclo, zanahoria y huevo duro." },
      { id: "p19", category: "Ensaladas", name: "Ensalada César", price: 13500, desc: "Mix verdes, pollo, parmesano y crutones." },
      { id: "p20", category: "Empanadas", name: "Empanada Carne a Cuchillo", price: 3500, desc: "Individual." },
      { id: "p21", category: "Empanadas", name: "Empanada Jamón y Queso", price: 3500, desc: "Individual." },
      { id: "p22", category: "Empanadas", name: "Empanada Pollo", price: 3500, desc: "Individual." },
      { id: "p23", category: "Empanadas", name: "Empanada Espinaca y Salsa Blanca", price: 3500, desc: "Individual." },
      { id: "p24", category: "Tartas", name: "Tarta Jamón y Queso", price: 12000, desc: "Tarta individual (aprox 600g)." },
      { id: "p25", category: "Tartas", name: "Tarta Kabutia", price: 12000, desc: "Tarta individual (aprox 600g)." },
      { id: "p26", category: "Tartas", name: "Tarta Acelga", price: 12000, desc: "Tarta individual (aprox 600g)." },
      { id: "p27", category: "Tartas", name: "Tarta Vegetales Mixta", price: 12000, desc: "Tarta individual (aprox 600g)." },
      { id: "p28", category: "Sandwichs Ciabatta", name: "Sándwich Completo", price: 17000, desc: "Carne o pollo, lechuga, tomate, jamón y queso en pan ciabatta." },
      { id: "p29", category: "Sandwichs Ciabatta", name: "Sándwich Mila Carne/Pollo c/ J&Q", price: 15000, desc: "Con jamón y queso en pan ciabatta." },
      { id: "p30", category: "Sandwichs Ciabatta", name: "Sándwich Solo Carne o Pollo", price: 13500, desc: "En pan ciabatta." },
      { id: "p31", category: "Sandwichs Ciabatta", name: "Sándwich De Pollo Especial", price: 15000, desc: "Pollo grillado, pesto de tomate seco y muzzarella en pan ciabatta." },
      { id: "p32", category: "Sandwichs Ciabatta", name: "Sándwich Jamón y Queso", price: 12000, desc: "En pan ciabatta." },
      { id: "p33", category: "Sandwichs Ciabatta", name: "Sándwich Jamón, Queso y Tomate", price: 12000, desc: "En pan ciabatta." },
      { id: "p34", category: "Sandwichs Ciabatta", name: "Sándwich Queso y Tomate", price: 12000, desc: "En pan ciabatta." },
    ],
  };
}

function menuLoad() {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return menuDefaultData();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.products) || parsed.products.length === 0) return menuDefaultData();
    return parsed;
  } catch (e) {
    console.error("Error leyendo menú:", e);
    return menuDefaultData();
  }
}

function menuSave(data) {
  try {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando menú:", e);
    return false;
  }
}

/* =========================================================
   MENÚ DE NAVEGACIÓN — abre/cierra el desplegable "Más"
   Llamar junto con cajaAplicarTema() en cada página.
========================================================= */
function cajaInitNavDropdown() {
  document.querySelectorAll(".nav-dropdown-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const dd = btn.closest(".nav-dropdown");
      document.querySelectorAll(".nav-dropdown.open").forEach(function (o) { if (o !== dd) o.classList.remove("open"); });
      dd.classList.toggle("open");
    });
  });
  document.addEventListener("click", function () {
    document.querySelectorAll(".nav-dropdown.open").forEach(function (o) { o.classList.remove("open"); });
  });
}

function cajaDefaults() {
  return {
    transactions: [],
    openings: {},
    config: { fixedCosts: [], variablePct: "", avgTicket: "", unit: "pedidos", autoTicket: true },
    businessName: "MYCFOODS",
  };
}

function cajaLoad() {
  try {
    const raw = localStorage.getItem(CAJA_STORAGE_KEY);
    if (!raw) return cajaDefaults();
    const parsed = JSON.parse(raw);
    const defaults = cajaDefaults();
    const merged = Object.assign(defaults, parsed);
    // Merge profundo de "config" para no perder campos si lo guardado es viejo/incompleto.
    merged.config = Object.assign(defaults.config, parsed.config || {});
    if (!Array.isArray(merged.config.fixedCosts)) merged.config.fixedCosts = [];
    if (!merged.transactions) merged.transactions = [];
    if (!merged.openings) merged.openings = {};
    return merged;
  } catch (e) {
    console.error("Error leyendo caja:", e);
    return cajaDefaults();
  }
}

function cajaSave(data) {
  try {
    localStorage.setItem(CAJA_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando caja:", e);
    return false;
  }
}

function cajaUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Fecha local (no UTC) en formato YYYY-MM-DD.
function cajaTodayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function cajaMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function cajaMonthLabel(key) {
  const parts = key.split("-");
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return names[parseInt(parts[1], 10) - 1] + " '" + parts[0].slice(2);
}

function cajaFmtMoney(n) {
  const v = Number(n) || 0;
  const sign = v < 0 ? "-" : "";
  return sign + "$" + Math.abs(v).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function cajaFmtDateLabel(dateStr) {
  const p = dateStr.split("-");
  return p[2] + "/" + p[1];
}

// Saldo = último saldo de apertura registrado (<= hoy) + movimientos desde esa fecha en adelante.
// Saldo FÍSICO de caja: apertura (efectivo contado) + ingresos en Efectivo − egresos en Efectivo.
// Transferencia / Tarjeta / QR-Mercado Pago son "plata virtual": no entran ni salen del cajón,
// así que no deben sumar ni restar del saldo de caja física (aunque sí cuentan como venta real
// en Libro Mayor y Reportes, que suman todos los métodos).
function cajaComputeBalances(transactions, openings) {
  const dates = Object.keys(openings || {}).sort();
  const today = cajaTodayStr();
  let baseDate = null, baseP = 0, baseC = 0;
  dates.forEach(function (d) {
    if (d <= today) {
      baseDate = d;
      baseP = (openings[d] && openings[d].principal) || 0;
      baseC = (openings[d] && openings[d].chica) || 0;
    }
  });
  let principal = baseP, chica = baseC;
  transactions.forEach(function (m) {
    if (baseDate && m.date < baseDate) return;
    if (m.method !== "Efectivo") return;
    const v = m.type === "ingreso" ? m.amount : -m.amount;
    if (m.ledger === "principal") principal += v; else chica += v;
  });
  return { principal: principal, chica: chica, baseDate: baseDate };
}

// Calcula cuál sería la apertura de HOY si no se ajustó manualmente:
// el saldo físico acumulado con todo lo cargado hasta el día anterior.
function cajaAutoApertura(transactions, openings) {
  const today = cajaTodayStr();
  const priorTx = transactions.filter(function (t) { return t.date < today; });
  return cajaComputeBalances(priorTx, openings);
}

function cajaAddTransaction(tx) {
  const data = cajaLoad();
  data.transactions.push(Object.assign({ id: cajaUid() }, tx));
  cajaSave(data);
  return data;
}

/* =========================================================
   Registrar una venta desde la página de pedidos.
   Se llama una sola vez, justo cuando se confirma e imprime
   la comanda (ver instrucciones de integración en index.html).
========================================================= */
function cajaRegistrarVentaDesdePedido(opts) {
  const categoria = CAJA_ENTREGA_TO_CATEGORY[opts.tipoEntrega] || "Otros ingresos";
  cajaAddTransaction({
    type: "ingreso",
    ledger: opts.ledger || "principal",
    date: cajaTodayStr(),
    category: categoria,
    method: opts.pago,
    amount: Number(opts.total) || 0,
    note: "Pedido: " + opts.nombre,
    items: Array.isArray(opts.items) ? opts.items : [],
  });
}

/* =========================================================
   Ranking de productos vendidos, a partir del detalle de
   ítems guardado en cada venta (ver cajaRegistrarVentaDesdePedido).
   Ventas cargadas a mano en Movimientos no tienen ítems y no entran acá.
========================================================= */
/* =========================================================
   PANEL — mostrar/ocultar, renombrar y reordenar tarjetas
   de cada pestaña, sin tocar código.
   Estructura guardada: site.panelConfig[tabId][cardId] =
     { visible: bool, titulo: string, orden: number }
========================================================= */
function cajaPanelConfig() {
  const site = siteLoad();
  return site.panelConfig || {};
}

function cajaPanelGuardar(tabId, cardId, campo, valor) {
  const site = siteLoad();
  if (!site.panelConfig) site.panelConfig = {};
  if (!site.panelConfig[tabId]) site.panelConfig[tabId] = {};
  if (!site.panelConfig[tabId][cardId]) site.panelConfig[tabId][cardId] = {};
  site.panelConfig[tabId][cardId][campo] = valor;
  siteSave(site);
}

function cajaPanelRestablecer(tabId) {
  const site = siteLoad();
  if (site.panelConfig) delete site.panelConfig[tabId];
  siteSave(site);
}

// Recibe [{id, titulo, orden}, ...] (definición por defecto de las tarjetas de una pestaña)
// y devuelve solo las visibles, con su título/orden ya combinados con lo guardado por el usuario.
function cajaPanelResolver(tabId, definiciones) {
  const cfg = cajaPanelConfig()[tabId] || {};
  return definiciones
    .map(function (d) {
      const guardado = cfg[d.id] || {};
      return {
        id: d.id,
        titulo: guardado.titulo != null && guardado.titulo !== "" ? guardado.titulo : d.titulo,
        orden: typeof guardado.orden === "number" ? guardado.orden : d.orden,
        visible: typeof guardado.visible === "boolean" ? guardado.visible : true,
      };
    })
    .sort(function (a, b) { return a.orden - b.orden; });
}

function cajaProductRanking(transactions, opts) {
  opts = opts || {};
  const desde = opts.desde || null; // "YYYY-MM-DD"
  const hasta = opts.hasta || null;
  const map = {};

  transactions.forEach(function (t) {
    if (!t.items || !t.items.length) return;
    if (desde && t.date < desde) return;
    if (hasta && t.date > hasta) return;
    t.items.forEach(function (it) {
      const key = it.nombre;
      if (!map[key]) map[key] = { nombre: key, cantidad: 0, total: 0, ventas: 0 };
      map[key].cantidad += Number(it.cantidad) || 0;
      map[key].total += (Number(it.precio) || 0) * (Number(it.cantidad) || 0);
      map[key].ventas += 1;
    });
  });

  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.cantidad - a.cantidad; });
}

/* =========================================================
   MESAS / SALÓN
   Cada mesa puede estar libre, ocupada o "pidió cuenta".
   Mientras está ocupada, acumula un pedido (carritoMesa) igual
   que el carrito de index.html. Al cerrar la cuenta, se registra
   como venta en caja (con categoría "Ventas salón") y la mesa
   vuelve a quedar libre.
========================================================= */
const MESAS_STORAGE_KEY = "mycfoods_mesas_v1";

function mesasDefaultData() {
  return {
    mesas: [
      { id: "mesa1", nombre: "Mesa 01", capacidad: 4, sector: "Salón Principal", estado: "libre", mozo: "", items: [], notas: "" },
      { id: "mesa2", nombre: "Mesa 02", capacidad: 4, sector: "Salón Principal", estado: "libre", mozo: "", items: [], notas: "" },
      { id: "mesa3", nombre: "Mesa 03", capacidad: 2, sector: "Galería Exterior", estado: "libre", mozo: "", items: [], notas: "" },
      { id: "mesa4", nombre: "Mesa 04", capacidad: 6, sector: "Barra / Boxes", estado: "libre", mozo: "", items: [], notas: "" },
    ],
  };
}

function mesasLoad() {
  try {
    const raw = localStorage.getItem(MESAS_STORAGE_KEY);
    if (!raw) return mesasDefaultData();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.mesas)) return mesasDefaultData();
    return parsed;
  } catch (e) {
    console.error("Error leyendo mesas:", e);
    return mesasDefaultData();
  }
}

function mesasSave(data) {
  try {
    localStorage.setItem(MESAS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando mesas:", e);
    return false;
  }
}

function mesaTotal(mesa) {
  return (mesa.items || []).reduce(function (a, it) { return a + it.precio * it.cantidad; }, 0);
}

/* =========================================================
   COMANDAS (cola de cocina / KDS)
   Se crea una comanda cada vez que se confirma un pedido
   (desde index.html o desde una mesa). Estados:
   pendiente -> en_preparacion -> listo -> entregado
========================================================= */
const COMANDAS_STORAGE_KEY = "mycfoods_comandas_v1";

function comandasLoad() {
  try {
    const raw = localStorage.getItem(COMANDAS_STORAGE_KEY);
    if (!raw) return { comandas: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.comandas)) return { comandas: [] };
    return parsed;
  } catch (e) {
    console.error("Error leyendo comandas:", e);
    return { comandas: [] };
  }
}

function comandasSave(data) {
  try {
    localStorage.setItem(COMANDAS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando comandas:", e);
    return false;
  }
}

// origen: "pedido" (delivery/retiro, desde index.html) | "mesa" (desde salón)
function cajaCrearComanda(opts) {
  const data = comandasLoad();
  const comanda = {
    id: cajaUid(),
    fecha: cajaTodayStr(),
    hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    origen: opts.origen || "pedido",
    referencia: opts.referencia || "", // nombre del cliente o nombre de la mesa
    tipoEntrega: opts.tipoEntrega || "",
    direccion: opts.direccion || "",
    items: Array.isArray(opts.items) ? opts.items : [],
    notas: opts.notas || "",
    estado: "pendiente",
    repartidor: "",
    estadoEntrega: opts.tipoEntrega === "Delivery" ? "pendiente" : "",
  };
  data.comandas.push(comanda);
  comandasSave(data);
  return comanda;
}

function cajaAvanzarComanda(id) {
  const orden = ["pendiente", "en_preparacion", "listo", "entregado"];
  const data = comandasLoad();
  const c = data.comandas.find(function (x) { return x.id === id; });
  if (!c) return;
  const idx = orden.indexOf(c.estado);
  if (idx >= 0 && idx < orden.length - 1) c.estado = orden[idx + 1];
  comandasSave(data);
}

/* =========================================================
   STOCK / INVENTARIO
   Control simple de cantidades e insumos, con alerta de mínimo.
   (No hace descuento automático por receta — es carga manual.)
========================================================= */
const STOCK_STORAGE_KEY = "mycfoods_stock_v1";

function stockLoad() {
  try {
    const raw = localStorage.getItem(STOCK_STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch (e) {
    console.error("Error leyendo stock:", e);
    return { items: [] };
  }
}

function stockSave(data) {
  try {
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando stock:", e);
    return false;
  }
}

/* =========================================================
   EMPLEADOS
========================================================= */
const EMPLEADOS_STORAGE_KEY = "mycfoods_empleados_v1";

function empleadosLoad() {
  try {
    const raw = localStorage.getItem(EMPLEADOS_STORAGE_KEY);
    if (!raw) return { empleados: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.empleados)) return { empleados: [] };
    return parsed;
  } catch (e) {
    console.error("Error leyendo empleados:", e);
    return { empleados: [] };
  }
}

function empleadosSave(data) {
  try {
    localStorage.setItem(EMPLEADOS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando empleados:", e);
    return false;
  }
}

/* =========================================================
   FICHAJES (hora de entrada/salida y pago de empleados)
========================================================= */
const FICHAJES_STORAGE_KEY = "mycfoods_fichajes_v1";

function fichajesLoad() {
  try {
    const raw = localStorage.getItem(FICHAJES_STORAGE_KEY);
    if (!raw) return { fichajes: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.fichajes)) return { fichajes: [] };
    return parsed;
  } catch (e) {
    console.error("Error leyendo fichajes:", e);
    return { fichajes: [] };
  }
}

function fichajesSave(data) {
  try {
    localStorage.setItem(FICHAJES_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error guardando fichajes:", e);
    return false;
  }
}

// Calcula horas trabajadas a partir de "HH:MM" de entrada y salida (soporta turnos que cruzan medianoche).
function calcularHorasTrabajadas(horaEntrada, horaSalida) {
  const [he, me] = horaEntrada.split(":").map(Number);
  const [hs, ms] = horaSalida.split(":").map(Number);
  let minEntrada = he * 60 + me;
  let minSalida = hs * 60 + ms;
  if (minSalida < minEntrada) minSalida += 24 * 60;
  return (minSalida - minEntrada) / 60;
}
