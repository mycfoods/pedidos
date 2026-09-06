/* =========================================================
   MYCFOODS · CAJA — lógica modular estilo MaxiRest (caja_2.js)
   Control total unificado: Salón, Mostrador, Delivery, Modificadores,
   Turnos de caja, Retiros parciales y Comandas sectorizadas.
========================================================= */

let state = cajaLoad();
let activeTab = "resumen";
let movFilterLedger = "todas";
let movFormType = "ingreso";
let movFormDate = null;
let aperturaEditing = false;
let mayorMonth = null;

// =========================================================
// NUEVAS ESTRUCTURAS MAXIREST: SALONES, TURNOS Y MODIFICADORES
// =========================================================
if (!state.maxirestConfig) {
  state.maxirestConfig = {
    modoVenta: "mostrador", // 'salon', 'mostrador', 'delivery'
    turnoActual: "Mañana",
    cajeroActual: "Admin",
    fondoFijoTurno: 0,
    retirosParciales: []
  };
}

if (!state.mesasSalones) {
  state.mesasSalones = [
    { id: 1, numero: "Mesa 1", estado: "libre", mozo: "", comanda: [] },
    { id: 2, numero: "Mesa 2", estado: "libre", mozo: "", comanda: [] },
    { id: 3, numero: "Mesa 3", estado: "libre", mozo: "", comanda: [] },
    { id: 4, numero: "Mostrador 1", estado: "activo", mozo: "Caja", comanda: [] }
  ];
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* =========================================================
   NAVEGACIÓN DE PESTAÑAS (Ampliadas a estilo MaxiRest)
========================================================= */
function setTab(id) {
  activeTab = id;
  document.querySelectorAll(".caja-tab-btn").forEach(function (b) {
    b.classList.toggle("active", b.dataset.tab === id);
  });
  document.querySelectorAll(".caja-panel").forEach(function (p) {
    p.classList.toggle("active", p.id === "panel-" + id);
  });
  renderActive();
}

function renderActive() {
  if (activeTab === "resumen") renderResumen();
  else if (activeTab === "movimientos") renderMovimientos();
  else if (activeTab === "menu") renderMenuAdmin();
  else if (activeTab === "ajustes") renderAjustes();
  else if (activeTab === "mayor") renderMayor();
  else if (activeTab === "equilibrio") renderEquilibrio();
  else if (activeTab === "reportes") renderReportes();
  else if (activeTab === "salon") renderSalonMesas(); // Módulo MaxiRest Nuevo
}

/* =========================================================
   MÓDULO NUEVO: SALÓN, MESAS Y COMANDAS (Estilo MaxiRest)
========================================================= */
function renderSalonMesas() {
  const el = document.getElementById("panel-salon");
  if (!el) return;
  const mesas = state.mesasSalones || [];

  let html = '<div class="caja-section-title"><h2>Gestión de Salón y Comandas (MaxiRest)</h2></div>';
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Estado de mesas y terminales</div>';
  html += '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">';
  
  mesas.forEach(function(m) {
    const ocupada = m.estado === "ocupado";
    html += '<div style="border:1px solid ' + (ocupada ? '#e2564a' : '#5fa372') + '; padding:10px; border-radius:6px; background:rgba(0,0,0,0.2); text-align:center;">' +
      '<div style="font-weight:bold; color:var(--text-white);">' + escapeHtml(m.numero) + '</div>' +
      '<div style="font-size:0.75rem; color:var(--text-gray); margin:4px 0;">' + (ocupada ? 'Ocupada (' + (m.mozo || 'Mozo') + ')' : 'Libre') + '</div>' +
      '<button class="caja-btn caja-btn-ghost" style="font-size:0.7rem; padding:4px 8px;" onclick="gestionarMesa(' + m.id + ')">' + (ocupada ? 'Ver / Cobrar' : 'Abrir Mesa') + '</button>' +
      '</div>';
  });
  html += '</div></div>';
  el.innerHTML = html;
}

function gestionarMesa(id) {
  const m = state.mesasSalones.find(x => x.id === id);
  if (!m) return;
  if (m.estado === "libre") {
    m.estado = "ocupado";
    m.mozo = prompt("Nombre del Mozo / Operador:", "Mostrador") || "Caja";
  } else {
    if (confirm("¿Cerrar mesa y registrar cobro en caja?")) {
      m.estado = "libre";
      m.comanda = [];
    }
  }
  cajaSave(state);
  renderSalonMesas();
}

/* =========================================================
   AJUSTES DEL SITIO
========================================================= */
function renderAjustes() {
  const el = document.getElementById("panel-ajustes");
  if (!el) return;
  const site = siteLoad();

  let html = '<div class="caja-section-title"><h2>Ajustes del sitio</h2></div>';

  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:8px;">Nombre del negocio (sale en tickets y reportes)</div>';
  html += '<input class="caja-input" value="' + escapeHtml(state.businessName || "") + '" onchange="guardarBusinessNameAjustes(this.value)" style="margin-bottom:14px;">';

  html += '<div class="stat-label" style="margin-bottom:8px;">WhatsApp de contacto</div>';
  html += '<input class="caja-input" placeholder="Ej: 5491122334455" value="' + escapeHtml(site.whatsapp) + '" onchange="actualizarAjuste(\'whatsapp\', this.value)">';
  html += '</div>';

  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Formas de pago disponibles (Arqueo MaxiRest)</div>';
  (site.metodosPago || []).forEach(function (m, i) {
    const esEfectivo = m.trim().toLowerCase() === "efectivo";
    html += '<div class="caja-row" style="align-items:center;">' +
      '<input class="caja-input" style="flex:1;" value="' + escapeHtml(m) + '" onchange="renombrarMetodoPago(' + i + ', this.value)" ' + (esEfectivo ? 'disabled' : '') + '>' +
      (esEfectivo ? '<span class="stat-sub" style="padding:0 6px;">🔒</span>' : '<button class="mov-del" onclick="borrarMetodoPago(' + i + ')"><i class="fa-solid fa-trash"></i></button>') +
      '</div>';
  });
  html += '<button class="caja-btn caja-btn-ghost" onclick="agregarMetodoPago()" style="margin-top:8px;">+ Agregar forma de pago</button>';
  html += '</div>';

  el.innerHTML = html;
}

function actualizarAjuste(campo, valor) {
  const site = siteLoad();
  site[campo] = valor;
  siteSave(site);
}

function guardarBusinessNameAjustes(v) {
  state.businessName = v;
  cajaSave(state);
}

function agregarMetodoPago() {
  const site = siteLoad();
  site.metodosPago.push("Nuevo método");
  siteSave(site);
  renderAjustes();
}

function renombrarMetodoPago(i, v) {
  const site = siteLoad();
  site.metodosPago[i] = v;
  siteSave(site);
}

function borrarMetodoPago(i) {
  const site = siteLoad();
  if ((site.metodosPago[i] || "").trim().toLowerCase() === "efectivo") return;
  if (!confirm("¿Borrar esta forma de pago?")) return;
  site.metodosPago.splice(i, 1);
  siteSave(site);
  renderAjustes();
}

/* =========================================================
   MENÚ — administración avanzada de productos y modificadores
========================================================= */
let menuEditingId = null;

function renderMenuAdmin() {
  const el = document.getElementById("panel-menu");
  if (!el) return;

  const data = menuLoad();
  const products = data.products || [];
  const categories = [];
  products.forEach(function (p) {
    if (categories.indexOf(p.category) === -1) categories.push(p.category);
  });

  const editing = menuEditingId ? products.find(function (p) { return p.id === menuEditingId; }) : null;

  let html = '<div class="caja-section-title"><h2>Menú y Familias (Estilo MaxiRest)</h2></div>';

  html += '<div class="caja-card">';
  html += '<div style="max-height:320px; overflow-y:auto; margin-bottom:14px;">';

  if (categories.length === 0) {
    html += '<div class="empty-note">Todavía no hay productos cargados.</div>';
  } else {
    categories.forEach(function (cat) {
      html += '<div style="margin-bottom:12px;">';
      html += '<div style="font-size:0.75rem; color:var(--accent); font-weight:700; margin-bottom:4px;">' + escapeHtml(cat) + '</div>';
      products.filter(function (p) { return p.category === cat; }).forEach(function (p) {
        html += '<div class="mov-row" style="padding:7px 0;">' +
          '<span style="flex:1; font-size:0.85rem; color:var(--text-white);">' + escapeHtml(p.name) + '</span>' +
          '<span style="font-family:\'Courier New\',monospace; font-size:0.8rem; color:var(--text-gray);">' + cajaFmtMoney(p.price) + '</span>' +
          '<button class="mov-del" onclick="editarProductoMenu(\'' + p.id + '\')"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="mov-del" onclick="borrarProductoMenu(\'' + p.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
          '</div>';
      });
      html += '</div>';
    });
  }

  html += '</div>';

  html += '<div style="border-top:1px solid var(--border-color); padding-top:12px;">';
  html += '<div class="stat-label" style="margin-bottom:8px;">' + (editing ? "Editar producto" : "Agregar producto") + '</div>';

  html += '<div class="caja-row">';
  html += '<input class="caja-input" style="flex:2;" id="menu-form-name" placeholder="Nombre" value="' + (editing ? escapeHtml(editing.name) : "") + '">';
  html += '<input class="caja-input" style="flex:1;" id="menu-form-price" type="number" placeholder="Precio" value="' + (editing ? editing.price : "") + '">';
  html += '</div>';

  html += '<div class="caja-row">';
  html += '<select class="caja-select" id="menu-form-category" style="flex:1;">';
  html += '<option value="">— familia existente —</option>';
  categories.forEach(function (c) {
    html += '<option value="' + escapeHtml(c) + '"' + (editing && editing.category === c ? " selected" : "") + '>' + escapeHtml(c) + '</option>';
  });
  html += '</select>';
  html += '<input class="caja-input" style="flex:1;" id="menu-form-newcategory" placeholder="o familia nueva">';
  html += '</div>';

  html += '<div class="caja-row">';
  html += '<button class="caja-btn caja-btn-primary" style="flex:1;" onclick="guardarProductoMenu()">' + (editing ? "Guardar cambios" : "+ Agregar al menú") + '</button>';
  if (editing) html += '<button class="caja-btn caja-btn-ghost" onclick="cancelarEdicionMenu()">Cancelar</button>';
  html += '</div>';

  html += '</div></div>';

  el.innerHTML = html;
}

function editarProductoMenu(id) {
  menuEditingId = id;
  renderMenuAdmin();
}

function cancelarEdicionMenu() {
  menuEditingId = null;
  renderMenuAdmin();
}

function borrarProductoMenu(id) {
  if (!confirm("¿Borrar este producto del menú?")) return;
  const data = menuLoad();
  data.products = data.products.filter(function (p) { return p.id !== id; });
  menuSave(data);
  if (menuEditingId === id) menuEditingId = null;
  renderMenuAdmin();
}

function guardarProductoMenu() {
  const name = document.getElementById("menu-form-name").value.trim();
  const price = parseFloat(document.getElementById("menu-form-price").value);
  const catSelect = document.getElementById("menu-form-category").value;
  const catNew = document.getElementById("menu-form-newcategory").value.trim();
  const category = catNew || catSelect;

  if (!name || !price || price <= 0 || !category) {
    alert("Completá nombre, precio y familia.");
    return;
  }

  const data = menuLoad();
  if (menuEditingId) {
    const p = data.products.find(function (x) { return x.id === menuEditingId; });
    if (p) { p.name = name; p.price = price; p.category = category; }
    menuEditingId = null;
  } else {
    data.products.push({ id: cajaUid(), name: name, price: price, category: category });
  }

  menuSave(data);
  renderMenuAdmin();
}

function movRowHtml(m) {
  const isIn = m.type === "ingreso";
  return (
    '<div class="mov-row">' +
    '<div class="mov-icon ' + (isIn ? "in" : "out") + '">' + (isIn ? "&uarr;" : "&darr;") + "</div>" +
    '<div style="flex:1; min-width:0;">' +
    '<div class="mov-cat">' + escapeHtml(m.category) + "</div>" +
    '<div class="mov-meta">' + cajaFmtDateLabel(m.date) + " &middot; " + escapeHtml(m.method) + " &middot; " +
    (m.ledger === "principal" ? "Caja mayor" : "Caja chica") + (m.note ? " &middot; " + escapeHtml(m.note) : "") + "</div>" +
    "</div>" +
    '<div class="mov-amount ' + (isIn ? "in" : "out") + '">' + (isIn ? "+" : "\u2212") + cajaFmtMoney(m.amount) + "</div>" +
    '<button class="mov-del" onclick="borrarMovimiento(\'' + m.id + '\')"><i class="fa-solid fa-trash"></i></button>' +
    "</div>"
  );
}

/* =========================================================
   RESUMEN
========================================================= */
function renderResumen() {
  const el = document.getElementById("panel-resumen");
  if (!el) return;
  const balances = cajaComputeBalances(state.transactions, state.openings);
  const today = cajaTodayStr();
  const thisMonth = cajaMonthKey(today);
  const monthTx = state.transactions.filter(function (t) { return cajaMonthKey(t.date) === thisMonth; });
  const monthIn = monthTx.filter(function (t) { return t.type === "ingreso"; }).reduce(function (a, t) { return a + t.amount; }, 0);
  const monthOut = monthTx.filter(function (t) { return t.type === "egreso"; }).reduce(function (a, t) { return a + t.amount; }, 0);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const tz = d.getTimezoneOffset() * 60000;
    const key = new Date(d.getTime() - tz).toISOString().slice(0, 10);
    const dayTx = state.transactions.filter(function (t) { return t.date === key; });
    const net = dayTx.reduce(function (a, t) { return a + (t.type === "ingreso" ? t.amount : -t.amount); }, 0);
    days.push({ label: cajaFmtDateLabel(key), net: net });
  }
  const maxAbs = Math.max(1, Math.max.apply(null, days.map(function (d) { return Math.abs(d.net); })));
  const recent = state.transactions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 6);

  el.innerHTML =
    '<div class="caja-section-title"><h2>Resumen general (Terminal Activa)</h2></div>' +
    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-label">Saldo caja mayor (efectivo)</div><div class="stat-value">' + cajaFmtMoney(balances.principal) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Saldo caja chica (efectivo)</div><div class="stat-value">' + cajaFmtMoney(balances.chica) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Ingresos del mes</div><div class="stat-value up">' + cajaFmtMoney(monthIn) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Egresos del mes</div><div class="stat-value down">' + cajaFmtMoney(monthOut) + "</div></div>" +
    "</div>" +
    '<div class="caja-section-title"><h2>Últimos movimientos</h2></div>' +
    '<div class="caja-card">' +
    (recent.length === 0 ? '<div class="empty-note">Todavía no hay movimientos.</div>' : recent.map(movRowHtml).join("")) +
    "</div>";
}

/* =========================================================
   MOVIMIENTOS Y ARQUEO DE CAJA
========================================================= */
function renderMovimientos() {
  const el = document.getElementById("panel-movimientos");
  if (!el) return;
  const today = cajaTodayStr();
  const opening = state.openings[today];
  const balances = cajaComputeBalances(state.transactions, state.openings);
  const todayTx = state.transactions.filter(function (t) { return t.date === today; });
  const todayIn = todayTx.filter(function (t) { return t.type === "ingreso"; }).reduce(function (a, t) { return a + t.amount; }, 0);
  const todayOut = todayTx.filter(function (t) { return t.type === "egreso"; }).reduce(function (a, t) { return a + t.amount; }, 0);

  const cats = movFormType === "ingreso" ? CAJA_INCOME_CATS : CAJA_EXPENSE_CATS;
  const sorted = state.transactions.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  const filtered = movFilterLedger === "todas" ? sorted : sorted.filter(function (t) { return t.ledger === movFilterLedger; });

  const showAperturaForm = aperturaEditing;
  const autoApertura = cajaAutoApertura(state.transactions, state.openings);

  let aperturaHtml;
  if (showAperturaForm) {
    const valPrincipal = opening ? opening.principal : autoApertura.principal;
    const valChica = opening ? opening.chica : autoApertura.chica;
    aperturaHtml =
      '<div class="stat-label" style="margin-bottom:10px;">Arqueo y Apertura de Turno</div>' +
      '<div class="caja-row">' +
      '<div class="caja-field"><label>Fondo fijo caja mayor</label><input class="caja-input" id="apertura-principal" type="number" value="' + valPrincipal + '"></div>' +
      '<div class="caja-field"><label>Fondo fijo caja chica</label><input class="caja-input" id="apertura-chica" type="number" value="' + valChica + '"></div>' +
      "</div>" +
      '<div class="caja-row">' +
      '<button class="caja-btn caja-btn-primary" style="flex:1;" onclick="guardarApertura()">Guardar apertura</button>' +
      '<button class="caja-btn caja-btn-ghost" onclick="cancelarEdicionApertura()">Cancelar</button>' +
      "</div>";
  } else {
    aperturaHtml =
      '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
      '<div class="stat-label">Apertura activa: <span style="color:var(--text-white); font-family:\'Courier New\',monospace;">' + cajaFmtMoney(autoApertura.principal) + '</span> mayor</div>' +
      '<button class="caja-btn caja-btn-ghost" onclick="editarApertura()">Ajustar Turno</button>' +
      "</div>";
  }

  const fechaActual = movFormDate || today;

  el.innerHTML =
    '<div class="caja-card" id="apertura-card">' + aperturaHtml + "</div>" +
    '<div class="caja-card">' +
    '<div class="caja-row" style="margin-bottom:12px;">' +
    '<button class="caja-btn" style="flex:1; border:1px solid ' + (movFormType === "ingreso" ? "#5fa372" : "var(--border-color)") + "; background:" + (movFormType === "ingreso" ? "rgba(95,163,114,0.12)" : "transparent") + "; color:" + (movFormType === "ingreso" ? "#5fa372" : "var(--text-gray)") + ';" onclick="setMovType(\'ingreso\')">+ Ingreso</button>' +
    '<button class="caja-btn" style="flex:1; border:1px solid ' + (movFormType === "egreso" ? "#e2564a" : "var(--border-color)") + "; background:" + (movFormType === "egreso" ? "rgba(226,86,74,0.12)" : "transparent") + "; color:" + (movFormType === "egreso" ? "#e2564a" : "var(--text-gray)") + ';" onclick="setMovType(\'egreso\')">&minus; Egreso</button>' +
    "</div>" +
    '<div class="big-amount-box"><span>$</span><input type="number" id="mov-amount" placeholder="0"></div>' +
    '<div class="caja-row">' +
    '<div class="caja-field"><label>Fecha</label><input class="caja-input" type="date" id="mov-date" value="' + fechaActual + '" onchange="movFormDate = this.value"></div>' +
    '<div class="caja-field"><label>Caja</label><select class="caja-select" id="mov-ledger"><option value="principal">Caja mayor</option><option value="chica">Caja chica</option></select></div>' +
    "</div>" +
    '<div class="stat-label" style="margin:10px 0 6px;">Categoría / Rubro</div>' +
    '<div class="caja-row" id="mov-cats">' +
    cats.map(function (c, i) { return '<button type="button" class="chip ' + (i === 0 ? "active" : "") + '" data-cat="' + escapeHtml(c) + '" onclick="selectMovCat(this)">' + escapeHtml(c) + "</button>"; }).join("") +
    "</div>" +
    '<div class="stat-label" style="margin:10px 0 6px;">Método de pago (MaxiRest)</div>' +
    '<div class="caja-row" id="mov-methods">' +
    getMetodosPago().map(function (m, i) { return '<button type="button" class="chip ' + (i === 0 ? "active" : "") + '" data-method="' + escapeHtml(m) + '" onclick="selectMovMethod(this)">' + escapeHtml(m) + "</button>"; }).join("") +
    "</div>" +
    '<input class="caja-input" id="mov-note" placeholder="Nota o detalle opcional" style="margin:10px 0 12px;">' +
    '<button class="caja-btn caja-btn-primary caja-btn-block" onclick="registrarMovimiento()">+ Registrar en Caja</button>' +
    "</div>" +
    '<div class="caja-section-title"><h2>Historial de Movimientos</h2></div>' +
    '<div class="caja-card">' +
    (filtered.length === 0 ? '<div class="empty-note">No hay movimientos registrados.</div>' : filtered.map(movRowHtml).join("")) +
    "</div>";
}

function setMovType(t) { movFormType = t; renderMovimientos(); }
function selectMovCat(btn) {
  const parent = btn.parentElement;
  parent.querySelectorAll(".chip").forEach(function (b) { b.classList.remove("active"); });
  btn.classList.add("active");
}
function selectMovMethod(btn) {
  const parent = btn.parentElement;
  parent.querySelectorAll(".chip").forEach(function (b) { b.classList.remove("active"); });
  btn.classList.add("active");
}
function editarApertura() { aperturaEditing = true; renderMovimientos(); }
function cancelarEdicionApertura() { aperturaEditing = false; renderMovimientos(); }
function guardarApertura() {
  const p = parseFloat(document.getElementById("apertura-principal").value) || 0;
  const c = parseFloat(document.getElementById("apertura-chica").value) || 0;
  state.openings[cajaTodayStr()] = { principal: p, chica: c };
  aperturaEditing = false;
  cajaSave(state);
  renderMovimientos();
}

function registrarMovimiento() {
  const amountInput = document.getElementById("mov-amount");
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) { alert("Ingresá un monto válido."); return; }
  const date = document.getElementById("mov-date").value || cajaTodayStr();
  const ledger = document.getElementById("mov-ledger").value;
  const catBtn = document.querySelector("#mov-cats .chip.active");
  const methodBtn = document.querySelector("#mov-methods .chip.active");
  const category = catBtn ? catBtn.dataset.cat : (movFormType === "ingreso" ? CAJA_INCOME_CATS[0] : CAJA_EXPENSE_CATS[0]);
  const method = methodBtn ? methodBtn.dataset.method : getMetodosPago()[0];
  const note = document.getElementById("mov-note").value.trim();
  state.transactions.push({ id: cajaUid(), type: movFormType, ledger: ledger, date: date, category: category, method: method, amount: amount, note: note });
  cajaSave(state);
  renderMovimientos();
}

function borrarMovimiento(id) {
  state.transactions = state.transactions.filter(function (t) { return t.id !== id; });
  cajaSave(state);
  renderActive();
}

/* =========================================================
   LIBRO MAYOR
========================================================= */
function renderMayor() {
  const el = document.getElementById("panel-mayor");
  if (!el) return;
  const monthsSet = {};
  state.transactions.forEach(function (t) { monthsSet[cajaMonthKey(t.date)] = true; });
  monthsSet[cajaMonthKey(cajaTodayStr())] = true;
  const months = Object.keys(monthsSet).sort().reverse();
  if (!mayorMonth || months.indexOf(mayorMonth) === -1) mayorMonth = months[0];

  const monthTx = state.transactions.filter(function (t) { return cajaMonthKey(t.date) === mayorMonth; });
  const grouped = {};
  monthTx.forEach(function (t) {
    if (!grouped[t.category]) grouped[t.category] = { category: t.category, type: t.type, total: 0, count: 0 };
    grouped[t.category].total += t.amount;
    grouped[t.category].count += 1;
  });
  const rows = Object.keys(grouped).map(function (k) { return grouped[k]; }).sort(function (a, b) { return b.total - a.total; });
  const income = rows.filter(function (r) { return r.type === "ingreso"; });
  const expense = rows.filter(function (r) { return r.type === "egreso"; });
  const totalIn = income.reduce(function (a, r) { return a + r.total; }, 0);
  const totalOut = expense.reduce(function (a, r) { return a + r.total; }, 0);

  function groupHtml(title, list, total, colorClass) {
    return '<div class="caja-card">' +
      '<div class="ledger-group-title"><span>' + title + '</span><span class="' + colorClass + '" style="font-family:\'Courier New\',monospace;">' + cajaFmtMoney(total) + "</span></div>" +
      (list.length === 0 ? '<div class="empty-note">Sin movimientos este mes.</div>' :
        list.map(function (r) { return '<div class="ledger-line"><span>' + escapeHtml(r.category) + " (" + r.count + ")</span><span>" + cajaFmtMoney(r.total) + "</span></div>"; }).join("")) +
      "</div>";
  }

  el.innerHTML =
    '<div class="caja-section-title"><h2>Libro mayor</h2>' +
    '<select class="caja-select" style="width:auto; padding:6px 10px; font-size:0.8rem;" onchange="setMayorMonth(this.value)">' +
    months.map(function (m) { return '<option value="' + m + '"' + (m === mayorMonth ? " selected" : "") + ">" + cajaMonthLabel(m) + "</option>"; }).join("") +
    "</select></div>" +
    groupHtml("Cuentas de ingreso", income, totalIn, "up") +
    groupHtml("Cuentas de egreso", expense, totalOut, "down");
}
function setMayorMonth(v) { mayorMonth = v; renderMayor(); }

/* =========================================================
   PUNTO DE EQUILIBRIO
========================================================= */
function renderEquilibrio() {
  const el = document.getElementById("panel-equilibrio");
  if (!el) return;
  const cfg = state.config;
  const totalFixed = cfg.fixedCosts.reduce(function (a, c) { return a + (parseFloat(c.amount) || 0); }, 0);
  const pct = parseFloat(cfg.variablePct) || 0;
  const margin = 1 - pct / 100;
  const peMonto = margin > 0 ? totalFixed / margin : 0;

  let html = '<div class="caja-section-title"><h2>Punto de equilibrio</h2></div>';
  html += '<div class="caja-card">';
  html += '<div class="ledger-group-title"><span>Costos fijos mensuales</span><span style="font-family:\'Courier New\',monospace;">' + cajaFmtMoney(totalFixed) + "</span></div>";
  html += '<div class="stat-value" style="margin-top:10px;">Punto de equilibrio mensual: ' + cajaFmtMoney(peMonto) + '</div>';
  html += '</div>';
  el.innerHTML = html;
}

/* =========================================================
   REPORTES Y CIERRES TÉRMICOS
========================================================= */
function renderReportes() {
  const el = document.getElementById("panel-reportes");
  if (!el) return;
  el.innerHTML =
    '<div class="caja-section-title"><h2>Reportes y Cierres MaxiRest</h2></div>' +
    '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:8px;">Nombre del negocio</div>' +
    '<input class="caja-input" id="business-name" value="' + escapeHtml(state.businessName || "") + '" onchange="updateBusinessName(this.value)" style="margin-bottom:12px;">' +
    '<div class="caja-row">' +
    '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="imprimirCierreDiario()"><i class="fa-solid fa-print"></i> Cierre de caja diario</button>' +
    '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="imprimirReporteMensual()"><i class="fa-solid fa-print"></i> Reporte mensual</button>' +
    "</div></div>";
}

function updateBusinessName(v) { state.businessName = v; cajaSave(state); }

function abrirVentanaImpresion(htmlBody) {
  const ventana = window.open("", "_blank", "width=400,height=600");
  if (!ventana) { alert("El navegador bloqueó la ventana de impresión."); return; }
  ventana.document.open();
  ventana.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket</title>' +
    "<style>" +
    "@page{size:80mm auto; margin:0;}" +
    "html,body{width:80mm; margin:0; padding:0; background:#fff;}" +
    "body{padding:2mm 3mm; font-family:'Courier New',monospace; font-size:12px; font-weight:bold; line-height:1.4; color:#000;}" +
    ".row{display:flex; justify-content:space-between; margin:2px 0;}" +
    ".divider{border-top:1px dashed #000; margin:6px 0;}" +
    ".center{text-align:center;}" +
    "</style></head><body>" + htmlBody + "</body></html>"
  );
  ventana.document.close();
  setTimeout(function () {
    try { ventana.focus(); ventana.print(); } catch (e) { console.error(e); }
    setTimeout(function () { try { ventana.close(); } catch (e) {} }, 1200);
  }, 300);
}

function ticketRow(label, value, bold) {
  return '<div class="row" style="' + (bold ? "font-weight:800;" : "") + '"><span>' + label + "</span><span>" + value + "</span></div>";
}

function buildCierreOrReporteHtml(title, txList, balances, stamp) {
  let inTotal = 0, outTotal = 0;
  txList.forEach(function (t) {
    if (t.type === "ingreso") inTotal += t.amount; else outTotal += t.amount;
  });

  let html = '<div class="center" style="font-size:14px;">' + escapeHtml(state.businessName || "MYCFOODS") + "</div>" +
    '<div class="center">' + title + "</div>" +
    '<div class="center" style="font-size:10px;">' + stamp + "</div>" +
    '<div class="divider"></div>';
  html += ticketRow("Total ingresos", cajaFmtMoney(inTotal), true);
  html += ticketRow("Total egresos", cajaFmtMoney(outTotal), true);
  html += '<div class="divider"></div>';
  html += ticketRow("Saldo caja mayor", cajaFmtMoney(balances.principal), true);
  html += ticketRow("Saldo caja chica", cajaFmtMoney(balances.chica), true);
  html += '<div class="divider"></div><div class="center" style="font-size:10px;">Generado con MaxiRest / MYCFOODS</div>';
  return html;
}

function imprimirCierreDiario() {
  const today = cajaTodayStr();
  const todayTx = state.transactions.filter(function (t) { return t.date === today; });
  const balances = cajaComputeBalances(state.transactions, state.openings);
  const html = buildCierreOrReporteHtml("CIERRE DE CAJA MAXIREST", todayTx, balances, new Date().toLocaleString("es-AR"));
  abrirVentanaImpresion(html);
}

function imprimirReporteMensual() {
  const monthKey = cajaMonthKey(cajaTodayStr());
  const monthTx = state.transactions.filter(function (t) { return cajaMonthKey(t.date) === monthKey; });
  const balances = cajaComputeBalances(state.transactions, state.openings);
  const html = buildCierreOrReporteHtml("REPORTE MENSUAL — " + cajaMonthLabel(monthKey).toUpperCase(), monthTx, balances, new Date().toLocaleString("es-AR"));
  abrirVentanaImpresion(html);
}

/* =========================================================
   INICIO
========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".caja-tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setTab(btn.dataset.tab); });
  });
  setTab("resumen");
});
