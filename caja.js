/* =========================================================
   MYCFOODS · CAJA — lógica de la página caja.html
   Requiere que caja-core.js esté cargado antes que este archivo.
========================================================= */

let state = cajaLoad();
let activeTab = "resumen";
let movFilterLedger = "todas";
let movFormType = "ingreso";
let aperturaEditing = false;
let mayorMonth = null;

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* =========================================================
   NAVEGACIÓN DE PESTAÑAS
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
  else if (activeTab === "mayor") renderMayor();
  else if (activeTab === "equilibrio") renderEquilibrio();
  else if (activeTab === "reportes") renderReportes();
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
    '<div class="caja-section-title"><h2>Resumen general</h2></div>' +
    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-label">Saldo caja mayor</div><div class="stat-value">' + cajaFmtMoney(balances.principal) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Saldo caja chica</div><div class="stat-value">' + cajaFmtMoney(balances.chica) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Ingresos del mes</div><div class="stat-value up">' + cajaFmtMoney(monthIn) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Egresos del mes</div><div class="stat-value down">' + cajaFmtMoney(monthOut) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Resultado del mes</div><div class="stat-value ' + (monthIn - monthOut >= 0 ? "up" : "down") + '">' + cajaFmtMoney(monthIn - monthOut) + "</div></div>" +
    "</div>" +
    '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:10px;">Flujo neto &mdash; últimos 7 días</div>' +
    '<div style="display:flex; align-items:flex-end; gap:8px; height:90px;">' +
    days.map(function (d) {
      return '<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">' +
        '<div style="width:100%; height:60px; display:flex; align-items:flex-end;">' +
        '<div style="width:100%; height:' + Math.max(4, Math.abs(d.net) / maxAbs * 60) + 'px; background:' + (d.net >= 0 ? "#5fa372" : "#e2564a") + '; border-radius:2px;"></div>' +
        "</div>" +
        '<span style="font-size:0.65rem; color:var(--text-gray);">' + d.label + "</span>" +
        "</div>";
    }).join("") +
    "</div></div>" +
    '<div class="caja-section-title"><h2>Últimos movimientos</h2></div>' +
    '<div class="caja-card">' +
    (recent.length === 0 ? '<div class="empty-note">Todavía no hay movimientos.</div>' : recent.map(movRowHtml).join("")) +
    "</div>";
}

/* =========================================================
   MOVIMIENTOS
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

  const showAperturaForm = !opening || aperturaEditing;

  let aperturaHtml;
  if (showAperturaForm) {
    aperturaHtml =
      '<div class="stat-label" style="margin-bottom:10px;">Apertura de caja &mdash; hoy</div>' +
      '<div class="caja-row">' +
      '<div class="caja-field"><label>Saldo inicial caja mayor</label><input class="caja-input" id="apertura-principal" type="number" placeholder="0" value="' + (opening ? opening.principal : "") + '"></div>' +
      '<div class="caja-field"><label>Saldo inicial caja chica</label><input class="caja-input" id="apertura-chica" type="number" placeholder="0" value="' + (opening ? opening.chica : "") + '"></div>' +
      "</div>" +
      '<button class="caja-btn caja-btn-primary caja-btn-block" onclick="guardarApertura()">Guardar apertura</button>';
  } else {
    aperturaHtml =
      '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
      '<div class="stat-label">Apertura de hoy: <span style="color:var(--text-white); font-family:\'Courier New\',monospace;">' + cajaFmtMoney(opening.principal) + '</span> mayor &middot; <span style="color:var(--text-white); font-family:\'Courier New\',monospace;">' + cajaFmtMoney(opening.chica) + "</span> chica</div>" +
      '<button class="caja-btn caja-btn-ghost" onclick="editarApertura()">Editar</button>' +
      "</div>";
  }

  el.innerHTML =
    '<div class="caja-card" id="apertura-card">' + aperturaHtml + "</div>" +

    '<div class="caja-card">' +
    '<div class="caja-row" style="margin-bottom:12px;">' +
    '<button class="caja-btn" style="flex:1; border:1px solid ' + (movFormType === "ingreso" ? "#5fa372" : "var(--border-color)") + "; background:" + (movFormType === "ingreso" ? "rgba(95,163,114,0.12)" : "transparent") + "; color:" + (movFormType === "ingreso" ? "#5fa372" : "var(--text-gray)") + ';" onclick="setMovType(\'ingreso\')">+ Ingreso</button>' +
    '<button class="caja-btn" style="flex:1; border:1px solid ' + (movFormType === "egreso" ? "#e2564a" : "var(--border-color)") + "; background:" + (movFormType === "egreso" ? "rgba(226,86,74,0.12)" : "transparent") + "; color:" + (movFormType === "egreso" ? "#e2564a" : "var(--text-gray)") + ';" onclick="setMovType(\'egreso\')">&minus; Egreso</button>' +
    "</div>" +
    '<div class="big-amount-box"><span>$</span><input type="number" id="mov-amount" placeholder="0"></div>' +
    '<div class="caja-row">' +
    '<div class="caja-field"><label>Fecha</label><input class="caja-input" type="date" id="mov-date" value="' + today + '"></div>' +
    '<div class="caja-field"><label>Caja</label><select class="caja-select" id="mov-ledger"><option value="principal">Caja mayor</option><option value="chica">Caja chica</option></select></div>' +
    "</div>" +
    '<div class="stat-label" style="margin:10px 0 6px;">Categoría</div>' +
    '<div class="caja-row" id="mov-cats">' +
    cats.map(function (c, i) { return '<button type="button" class="chip ' + (i === 0 ? "active" : "") + '" data-cat="' + escapeHtml(c) + '" onclick="selectMovCat(this)">' + escapeHtml(c) + "</button>"; }).join("") +
    "</div>" +
    '<div class="stat-label" style="margin:10px 0 6px;">Método de pago</div>' +
    '<div class="caja-row" id="mov-methods">' +
    CAJA_METHODS.map(function (m, i) { return '<button type="button" class="chip ' + (i === 0 ? "active" : "") + '" data-method="' + escapeHtml(m) + '" onclick="selectMovMethod(this)">' + escapeHtml(m) + "</button>"; }).join("") +
    "</div>" +
    '<input class="caja-input" id="mov-note" placeholder="Nota (opcional)" style="margin:10px 0 12px;">' +
    '<button class="caja-btn caja-btn-primary caja-btn-block" onclick="registrarMovimiento()">+ Registrar movimiento</button>' +
    "</div>" +

    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-label">Hoy &mdash; ingresos</div><div class="stat-value up">' + cajaFmtMoney(todayIn) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Hoy &mdash; egresos</div><div class="stat-value down">' + cajaFmtMoney(todayOut) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Saldo caja mayor</div><div class="stat-value">' + cajaFmtMoney(balances.principal) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Saldo caja chica</div><div class="stat-value">' + cajaFmtMoney(balances.chica) + "</div></div>" +
    "</div>" +

    '<div class="caja-section-title"><h2>Historial</h2>' +
    '<select class="caja-select" style="width:auto; padding:6px 10px; font-size:0.8rem;" onchange="setMovFilter(this.value)">' +
    '<option value="todas"' + (movFilterLedger === "todas" ? " selected" : "") + ">Todas las cajas</option>" +
    '<option value="principal"' + (movFilterLedger === "principal" ? " selected" : "") + ">Caja mayor</option>" +
    '<option value="chica"' + (movFilterLedger === "chica" ? " selected" : "") + ">Caja chica</option>" +
    "</select></div>" +
    '<div class="caja-card">' +
    (filtered.length === 0 ? '<div class="empty-note">No hay movimientos para este filtro.</div>' : filtered.map(movRowHtml).join("")) +
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
function setMovFilter(v) { movFilterLedger = v; renderMovimientos(); }

function editarApertura() { aperturaEditing = true; renderMovimientos(); }

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
  const method = methodBtn ? methodBtn.dataset.method : CAJA_METHODS[0];
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
    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-label">Total ingresos</div><div class="stat-value up">' + cajaFmtMoney(totalIn) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Total egresos</div><div class="stat-value down">' + cajaFmtMoney(totalOut) + "</div></div>" +
    '<div class="stat-card"><div class="stat-label">Saldo del mes</div><div class="stat-value ' + (totalIn - totalOut >= 0 ? "up" : "down") + '">' + cajaFmtMoney(totalIn - totalOut) + "</div></div>" +
    "</div>" +
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
  const isAuto = cfg.autoTicket !== false;
  const unitLabel = cfg.unit || "pedidos";

  const thisMonth = cajaMonthKey(cajaTodayStr());
  const monthIncomeTx = state.transactions.filter(function (t) { return t.type === "ingreso" && cajaMonthKey(t.date) === thisMonth; });
  const realCount = monthIncomeTx.length;
  const realTotal = monthIncomeTx.reduce(function (a, t) { return a + t.amount; }, 0);
  const realAvg = realCount > 0 ? realTotal / realCount : null;

  const totalFixed = cfg.fixedCosts.reduce(function (a, c) { return a + (parseFloat(c.amount) || 0); }, 0);
  const pct = parseFloat(cfg.variablePct) || 0;
  const margin = 1 - pct / 100;
  const peMonto = margin > 0 ? totalFixed / margin : null;
  const ticket = isAuto ? (realAvg || 0) : (parseFloat(cfg.avgTicket) || 0);
  const peUnidades = peMonto && ticket > 0 ? peMonto / ticket : null;

  let html = '<div class="caja-section-title"><h2>Punto de equilibrio</h2></div>';

  html += '<div class="caja-card">' +
    '<div class="ledger-group-title"><span>Costos fijos mensuales</span><span style="font-family:\'Courier New\',monospace;">' + cajaFmtMoney(totalFixed) + "</span></div>" +
    '<div id="fixed-costs-list">' +
    cfg.fixedCosts.map(function (c, i) {
      return '<div class="caja-row" style="align-items:center;">' +
        '<input class="caja-input" style="flex:2;" placeholder="Ej: Alquiler" value="' + escapeHtml(c.name) + '" onchange="updateFixedCost(' + i + ', \'name\', this.value)">' +
        '<input class="caja-input" style="flex:1;" type="number" placeholder="Monto" value="' + c.amount + '" onchange="updateFixedCost(' + i + ', \'amount\', this.value)">' +
        '<button class="mov-del" onclick="removeFixedCost(' + i + ')"><i class="fa-solid fa-xmark"></i></button>' +
        "</div>";
    }).join("") +
    "</div>" +
    '<button class="caja-btn caja-btn-ghost" onclick="addFixedCost()">+ Agregar costo fijo</button>' +
    "</div>";

  html += '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:10px;">Costos variables y ticket</div>' +
    '<div class="caja-row">' +
    '<div class="caja-field"><label>Costo variable (% s/ventas)</label><input class="caja-input" type="number" value="' + cfg.variablePct + '" onchange="updateConfig(\'variablePct\', this.value)"></div>' +
    '<div class="caja-field"><label>Unidad de venta</label><input class="caja-input" value="' + escapeHtml(unitLabel) + '" onchange="updateConfig(\'unit\', this.value)"></div>' +
    "</div>" +
    '<div class="stat-label" style="margin:10px 0 6px;">Ticket promedio por ' + unitLabel.replace(/s$/, "") + "</div>" +
    '<div class="caja-row" style="margin-bottom:10px;">' +
    '<button class="chip ' + (isAuto ? "active green" : "") + '" onclick="updateConfig(\'autoTicket\', true)">Automático</button>' +
    '<button class="chip ' + (!isAuto ? "active" : "") + '" onclick="updateConfig(\'autoTicket\', false)">Manual</button>' +
    "</div>";

  if (isAuto) {
    html += realAvg !== null
      ? '<div class="caja-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0; padding:10px 12px;">' +
        '<span style="font-size:0.8rem; color:var(--text-gray);">Calculado con ' + realCount + " " + unitLabel + ' de este mes</span>' +
        '<span style="font-family:\'Courier New\',monospace; font-size:1.1rem; font-weight:700;">' + cajaFmtMoney(realAvg) + "</span></div>"
      : '<div class="empty-note">Todavía no cargaste ingresos este mes &mdash; cargá movimientos o pedidos, o pasá a manual.</div>';
  } else {
    html += '<div class="caja-field"><label>Ticket promedio ($)</label><input class="caja-input" type="number" value="' + cfg.avgTicket + '" onchange="updateConfig(\'avgTicket\', this.value)"></div>';
  }
  html += "</div>";

  if (peMonto === null) {
    html += '<div class="caja-card empty-note">Cargá un % de costo variable menor a 100 para calcular el punto de equilibrio.</div>';
  } else {
    html += '<div class="stat-grid">' +
      '<div class="stat-card"><div class="stat-label">Punto de equilibrio mensual</div><div class="stat-value">' + cajaFmtMoney(peMonto) + "</div></div>" +
      '<div class="stat-card"><div class="stat-label">Punto de equilibrio diario</div><div class="stat-value">' + cajaFmtMoney(peMonto / 30) + "</div></div>" +
      (ticket > 0 ? '<div class="stat-card"><div class="stat-label">' + unitLabel + ' necesarios al mes</div><div class="stat-value">' + Math.ceil(peUnidades).toLocaleString("es-AR") + '</div><div class="stat-sub">&asymp; ' + Math.ceil(peUnidades / 30) + " por día</div></div>" : "") +
      "</div>";

    if (ticket > 0) {
      const pct2 = Math.min(100, (realCount / Math.max(1, peUnidades)) * 100);
      html += '<div class="caja-card">' +
        '<div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-gray); margin-bottom:8px;">' +
        "<span>" + unitLabel + " del mes vs. necesarios</span>" +
        '<span style="font-family:\'Courier New\',monospace;">' + realCount + " / " + Math.ceil(peUnidades) + "</span></div>" +
        '<div class="progress-track"><div class="progress-fill ' + (realCount >= peUnidades ? "done" : "") + '" style="width:' + pct2 + '%"></div></div>' +
        '<div class="stat-sub" style="margin-top:8px;">' +
        (realCount >= peUnidades ? "Ya superaste los " + unitLabel + " necesarios para cubrir costos este mes." : "Faltan " + Math.ceil(peUnidades - realCount) + " " + unitLabel + " para llegar al punto de equilibrio.") +
        "</div></div>";
    }
  }

  el.innerHTML = html;
}

function addFixedCost() { state.config.fixedCosts.push({ name: "", amount: "" }); cajaSave(state); renderEquilibrio(); }
function removeFixedCost(i) { state.config.fixedCosts.splice(i, 1); cajaSave(state); renderEquilibrio(); }
function updateFixedCost(i, field, value) { state.config.fixedCosts[i][field] = value; cajaSave(state); }
function updateConfig(field, value) { state.config[field] = value; cajaSave(state); renderEquilibrio(); }

/* =========================================================
   REPORTES
========================================================= */
function renderReportes() {
  const el = document.getElementById("panel-reportes");
  if (!el) return;
  const map = {};
  state.transactions.forEach(function (t) {
    const k = cajaMonthKey(t.date);
    if (!map[k]) map[k] = { key: k, ingresos: 0, egresos: 0 };
    if (t.type === "ingreso") map[k].ingresos += t.amount; else map[k].egresos += t.amount;
  });
  const monthly = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.key < b.key ? -1 : 1; }).slice(-6);
  const maxVal = Math.max(1, Math.max.apply(null, monthly.map(function (m) { return Math.max(m.ingresos, m.egresos); }).concat([0])));

  const thisMonth = cajaMonthKey(cajaTodayStr());
  const monthTx = state.transactions.filter(function (t) { return cajaMonthKey(t.date) === thisMonth; });
  const byCat = {};
  monthTx.filter(function (t) { return t.type === "egreso"; }).forEach(function (t) { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const catRows = Object.keys(byCat).map(function (k) { return { category: k, total: byCat[k] }; }).sort(function (a, b) { return b.total - a.total; });
  const maxCat = Math.max(1, Math.max.apply(null, catRows.map(function (r) { return r.total; }).concat([0])));

  const byMethod = {};
  monthTx.forEach(function (t) { byMethod[t.method] = (byMethod[t.method] || 0) + (t.type === "ingreso" ? t.amount : -t.amount); });

  el.innerHTML =
    '<div class="caja-section-title"><h2>Reportes</h2></div>' +
    '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:8px;">Nombre del negocio (aparece en el ticket)</div>' +
    '<input class="caja-input" id="business-name" value="' + escapeHtml(state.businessName || "") + '" onchange="updateBusinessName(this.value)" style="margin-bottom:12px;">' +
    '<div class="caja-row">' +
    '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="imprimirCierreDiario()"><i class="fa-solid fa-print"></i> Cierre de caja de hoy</button>' +
    '<button class="caja-btn caja-btn-ghost" style="flex:1;" onclick="imprimirReporteMensual()"><i class="fa-solid fa-print"></i> Reporte mensual</button>' +
    "</div></div>" +

    '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:10px;">Ingresos vs. egresos &mdash; últimos 6 meses</div>' +
    '<div style="display:flex; align-items:flex-end; gap:14px; height:120px;">' +
    monthly.map(function (m) {
      return '<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">' +
        '<div style="display:flex; gap:3px; align-items:flex-end; height:90px;">' +
        '<div style="width:12px; height:' + Math.max(3, m.ingresos / maxVal * 90) + 'px; background:#5fa372; border-radius:2px;"></div>' +
        '<div style="width:12px; height:' + Math.max(3, m.egresos / maxVal * 90) + 'px; background:#e2564a; border-radius:2px;"></div>' +
        "</div>" +
        '<span style="font-size:0.65rem; color:var(--text-gray);">' + cajaMonthLabel(m.key) + "</span></div>";
    }).join("") +
    "</div>" +
    '<div style="display:flex; gap:14px; margin-top:10px; font-size:0.7rem; color:var(--text-gray);">' +
    '<span><span style="display:inline-block;width:9px;height:9px;background:#5fa372;border-radius:2px;margin-right:4px;"></span>Ingresos</span>' +
    '<span><span style="display:inline-block;width:9px;height:9px;background:#e2564a;border-radius:2px;margin-right:4px;"></span>Egresos</span>' +
    "</div></div>" +

    '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:10px;">Egresos por categoría &mdash; mes actual</div>' +
    (catRows.length === 0 ? '<div class="empty-note">Sin egresos cargados este mes.</div>' :
      catRows.map(function (r) {
        return '<div style="margin-bottom:8px;">' +
          '<div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:3px;"><span style="color:var(--text-gray);">' + escapeHtml(r.category) + '</span><span style="font-family:\'Courier New\',monospace;">' + cajaFmtMoney(r.total) + "</span></div>" +
          '<div class="progress-track"><div class="progress-fill" style="width:' + (r.total / maxCat * 100) + '%"></div></div></div>';
      }).join("")) +
    "</div>" +

    '<div class="caja-card">' +
    '<div class="stat-label" style="margin-bottom:10px;">Neto por método de pago &mdash; mes actual</div>' +
    (Object.keys(byMethod).length === 0 ? '<div class="empty-note">Sin movimientos este mes.</div>' :
      Object.keys(byMethod).map(function (method) {
        const total = byMethod[method];
        return '<div class="report-cat-row"><span>' + escapeHtml(method) + '</span><span style="color:' + (total >= 0 ? "#5fa372" : "#e2564a") + ';">' + cajaFmtMoney(total) + "</span></div>";
      }).join("")) +
    "</div>";
}

function updateBusinessName(v) { state.businessName = v; cajaSave(state); }

/* =========================================================
   IMPRESIÓN (mismo patrón de ventana que ya usás en imprimirComanda)
========================================================= */
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
  const incomeByCat = {}, expenseByCat = {}, byMethod = {};
  let inTotal = 0, outTotal = 0;
  txList.forEach(function (t) {
    if (t.type === "ingreso") { incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount; inTotal += t.amount; }
    else { expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount; outTotal += t.amount; }
    byMethod[t.method] = (byMethod[t.method] || 0) + (t.type === "ingreso" ? t.amount : -t.amount);
  });

  let html = '<div class="center" style="font-size:14px;">' + escapeHtml(state.businessName || "MYCFOODS") + "</div>" +
    '<div class="center">' + title + "</div>" +
    '<div class="center" style="font-size:10px;">' + stamp + "</div>" +
    '<div class="divider"></div><div style="font-weight:800;">INGRESOS' + (title.indexOf("MENSUAL") >= 0 ? " POR CATEGORÍA" : "") + "</div>";
  html += Object.keys(incomeByCat).length === 0 ? "<div>&mdash; sin movimientos &mdash;</div>" :
    Object.keys(incomeByCat).map(function (k) { return ticketRow(escapeHtml(k), cajaFmtMoney(incomeByCat[k])); }).join("");
  html += ticketRow("Total ingresos", cajaFmtMoney(inTotal), true);
  html += '<div class="divider"></div><div style="font-weight:800;">EGRESOS' + (title.indexOf("MENSUAL") >= 0 ? " POR CATEGORÍA" : "") + "</div>";
  html += Object.keys(expenseByCat).length === 0 ? "<div>&mdash; sin movimientos &mdash;</div>" :
    Object.keys(expenseByCat).map(function (k) { return ticketRow(escapeHtml(k), cajaFmtMoney(expenseByCat[k])); }).join("");
  html += ticketRow("Total egresos", cajaFmtMoney(outTotal), true);
  html += '<div class="divider"></div><div style="font-weight:800;">POR MÉTODO DE PAGO</div>';
  html += Object.keys(byMethod).map(function (k) { return ticketRow(escapeHtml(k), cajaFmtMoney(byMethod[k])); }).join("");
  html += '<div class="divider"></div>';
  html += ticketRow(title.indexOf("MENSUAL") >= 0 ? "Resultado del mes" : "Resultado del día", cajaFmtMoney(inTotal - outTotal), true);
  html += ticketRow("Saldo caja mayor", cajaFmtMoney(balances.principal), true);
  html += ticketRow("Saldo caja chica", cajaFmtMoney(balances.chica), true);
  html += '<div class="divider"></div><div class="center" style="font-size:10px;">Generado con Caja MYCFOODS</div>';
  return html;
}

function imprimirCierreDiario() {
  const today = cajaTodayStr();
  const todayTx = state.transactions.filter(function (t) { return t.date === today; });
  const balances = cajaComputeBalances(state.transactions, state.openings);
  const html = buildCierreOrReporteHtml("CIERRE DE CAJA DIARIO", todayTx, balances, new Date().toLocaleString("es-AR"));
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
