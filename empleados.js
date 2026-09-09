/* =========================================================
   MYCFOODS · EMPLEADOS — personal, roles, PIN, fichadas y pagos
   Requiere caja-core.js cargado antes.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

let empActiveTab = "personal";
let empEditingId = null;
let fichajeEditingId = null;
const ROLES = ["Mozo/a", "Cocina", "Cajero/a", "Delivery", "Administración"];

function setEmpTab(id) {
  empActiveTab = id;
  document.querySelectorAll(".caja-tab-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === id); });
  document.querySelectorAll(".caja-panel").forEach(function (p) { p.classList.toggle("active", p.id === "panel-" + id); });
  if (id === "personal") { renderEmpForm(); renderEmpList(); }
  else { renderFichajeForm(); renderFichajeList(); }
}

/* =========================================================
   PERSONAL
========================================================= */
function renderEmpForm() {
  const card = document.getElementById("emp-form-card");
  if (!card) return;

  const data = empleadosLoad();
  const editing = empEditingId ? data.empleados.find(function (x) { return x.id === empEditingId; }) : null;

  let html = '<div class="stat-label" style="margin-bottom:10px;">' + (editing ? "Editar empleado" : "Agregar empleado") + '</div>';
  html += '<div class="caja-row">';
  html += '<input class="caja-input" id="emp-nombre" style="flex:2;" placeholder="Nombre y apellido" value="' + (editing ? escapeHtml(editing.nombre) : "") + '">';
  html += '<select class="caja-select" id="emp-rol" style="flex:1;">';
  html += ROLES.map(function (r) { return '<option value="' + r + '"' + (editing && editing.rol === r ? " selected" : "") + '>' + r + '</option>'; }).join("");
  html += '</select>';
  html += '</div>';
  html += '<div class="caja-row">';
  html += '<input class="caja-input" id="emp-pin" style="flex:1;" placeholder="PIN de acceso (opcional)" maxlength="6" value="' + (editing ? escapeHtml(editing.pin || "") : "") + '">';
  html += '<input class="caja-input" id="emp-valorhora" type="number" style="flex:1;" placeholder="Valor por hora ($)" value="' + (editing ? (editing.valorHora || "") : "") + '">';
  html += '</div>';
  html += '<div class="caja-row">';
  html += '<button class="caja-btn caja-btn-primary" style="flex:1;" onclick="guardarEmpleado()">' + (editing ? "Guardar cambios" : "+ Agregar") + '</button>';
  if (editing) html += '<button class="caja-btn caja-btn-ghost" onclick="cancelarEdicionEmp()">Cancelar</button>';
  html += '</div>';

  card.innerHTML = html;
}

function renderEmpList() {
  const card = document.getElementById("emp-list-card");
  if (!card) return;

  const data = empleadosLoad();
  if (data.empleados.length === 0) {
    card.innerHTML = '<div class="empty-note">Todavía no cargaste empleados.</div>';
    return;
  }

  let html = '<div class="stat-label" style="margin-bottom:6px;">Personal</div>';
  data.empleados.forEach(function (e) {
    html += '<div class="data-row">';
    html += '<span style="flex:1;">' + escapeHtml(e.nombre) + '</span>';
    html += '<span class="chip" style="pointer-events:none;">' + escapeHtml(e.rol) + '</span>';
    if (e.valorHora) html += '<span style="font-family:\'Courier New\',monospace; font-size:0.8rem; color:var(--text-gray);">' + cajaFmtMoney(e.valorHora) + '/h</span>';
    html += '<button class="mov-del" onclick="editarEmpleado(\'' + e.id + '\')"><i class="fa-solid fa-pen"></i></button>';
    html += '<button class="mov-del" onclick="borrarEmpleado(\'' + e.id + '\')"><i class="fa-solid fa-trash"></i></button>';
    html += '</div>';
  });

  card.innerHTML = html;
}

function editarEmpleado(id) { empEditingId = id; renderEmpForm(); }
function cancelarEdicionEmp() { empEditingId = null; renderEmpForm(); }

function guardarEmpleado() {
  const nombre = document.getElementById("emp-nombre").value.trim();
  const rol = document.getElementById("emp-rol").value;
  const pin = document.getElementById("emp-pin").value.trim();
  const valorHora = parseFloat(document.getElementById("emp-valorhora").value) || 0;

  if (!nombre) { alert("Ingresá un nombre."); return; }

  const data = empleadosLoad();
  if (empEditingId) {
    const e = data.empleados.find(function (x) { return x.id === empEditingId; });
    if (e) { e.nombre = nombre; e.rol = rol; e.pin = pin; e.valorHora = valorHora; }
    empEditingId = null;
  } else {
    data.empleados.push({ id: cajaUid(), nombre: nombre, rol: rol, pin: pin, valorHora: valorHora, activo: true });
  }
  empleadosSave(data);
  renderEmpForm();
  renderEmpList();
}

function borrarEmpleado(id) {
  if (!confirm("¿Borrar este empleado? (las fichadas ya pagadas no se borran)")) return;
  const data = empleadosLoad();
  data.empleados = data.empleados.filter(function (x) { return x.id !== id; });
  empleadosSave(data);
  if (empEditingId === id) empEditingId = null;
  renderEmpForm();
  renderEmpList();
}

/* =========================================================
   FICHADAS Y PAGOS
========================================================= */
let fichajeEmpleadoSeleccionado = null;

function horaActualStr() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function turnoAbiertoDe(empleadoId) {
  const data = fichajesLoad();
  return data.fichajes.find(function (f) { return f.empleadoId === empleadoId && f.horaEntrada && !f.horaSalida; });
}

function renderFichajeForm() {
  const card = document.getElementById("fichaje-form-card");
  if (!card) return;

  const empData = empleadosLoad();
  if (empData.empleados.length === 0) {
    card.innerHTML = '<div class="empty-note">Cargá primero un empleado en la pestaña "Personal".</div>';
    return;
  }

  if (!fichajeEmpleadoSeleccionado || !empData.empleados.find(function (e) { return e.id === fichajeEmpleadoSeleccionado; })) {
    fichajeEmpleadoSeleccionado = empData.empleados[0].id;
  }

  const turnoAbierto = turnoAbiertoDe(fichajeEmpleadoSeleccionado);

  let html = '<div class="stat-label" style="margin-bottom:10px;">Reloj de entrada / salida</div>';
  html += '<div class="caja-row" style="margin-bottom:16px;">';
  html += '<select class="caja-select" onchange="fichajeEmpleadoSeleccionado=this.value; renderFichajeForm();">';
  html += empData.empleados.map(function (e) {
    return '<option value="' + e.id + '"' + (e.id === fichajeEmpleadoSeleccionado ? " selected" : "") + '>' + escapeHtml(e.nombre) + '</option>';
  }).join("");
  html += '</select>';
  html += '</div>';

  if (turnoAbierto) {
    html += '<div class="stat-sub" style="text-align:center; margin-bottom:10px;">Turno abierto desde las <strong style="color:var(--text-white);">' + turnoAbierto.horaEntrada + '</strong></div>';
    html += '<button class="caja-btn caja-btn-block" style="background:#e2564a; color:#fff; padding:22px 0; font-size:1.1rem;" onclick="marcarSalida()"><i class="fa-solid fa-right-from-bracket"></i> SALIDA</button>';
  } else {
    html += '<button class="caja-btn caja-btn-block" style="background:#5fa372; color:#fff; padding:22px 0; font-size:1.1rem;" onclick="marcarEntrada()"><i class="fa-solid fa-right-to-bracket"></i> ENTRADA</button>';
  }

  html += '<div class="stat-sub" style="margin-top:14px; text-align:center;">La hora se registra sola, con la hora actual del dispositivo.</div>';

  card.innerHTML = html;
}

function marcarEntrada() {
  const data = fichajesLoad();
  data.fichajes.push({
    id: cajaUid(), empleadoId: fichajeEmpleadoSeleccionado, fecha: cajaTodayStr(),
    horaEntrada: horaActualStr(), horaSalida: null, horas: null, monto: null, pagado: false,
  });
  fichajesSave(data);
  renderFichajeForm();
  renderFichajeList();
}

function marcarSalida() {
  const data = fichajesLoad();
  const f = data.fichajes.find(function (x) { return x.empleadoId === fichajeEmpleadoSeleccionado && x.horaEntrada && !x.horaSalida; });
  if (!f) return;

  const empData = empleadosLoad();
  const emp = empData.empleados.find(function (e) { return e.id === fichajeEmpleadoSeleccionado; });

  f.horaSalida = horaActualStr();
  f.horas = calcularHorasTrabajadas(f.horaEntrada, f.horaSalida);
  f.monto = f.horas * (emp ? (emp.valorHora || 0) : 0);
  fichajesSave(data);
  renderFichajeForm();
  renderFichajeList();
}

function editarFichajeManual(id) {
  const data = fichajesLoad();
  const f = data.fichajes.find(function (x) { return x.id === id; });
  if (!f) return;
  if (f.pagado) { alert("Esta fichada ya está pagada y no se puede editar."); return; }

  const nuevaEntrada = prompt("Hora de entrada (HH:MM):", f.horaEntrada || "");
  if (nuevaEntrada === null) return;
  const nuevaSalida = prompt("Hora de salida (HH:MM, dejar vacío si sigue en curso):", f.horaSalida || "");
  if (nuevaSalida === null) return;

  const empData = empleadosLoad();
  const emp = empData.empleados.find(function (e) { return e.id === f.empleadoId; });

  f.horaEntrada = nuevaEntrada.trim();
  f.horaSalida = nuevaSalida.trim() || null;
  if (f.horaEntrada && f.horaSalida) {
    f.horas = calcularHorasTrabajadas(f.horaEntrada, f.horaSalida);
    f.monto = f.horas * (emp ? (emp.valorHora || 0) : 0);
  } else {
    f.horas = null; f.monto = null;
  }
  fichajesSave(data);
  renderFichajeForm();
  renderFichajeList();
}

function borrarFichaje(id) {
  if (!confirm("¿Borrar esta fichada?")) return;
  const data = fichajesLoad();
  data.fichajes = data.fichajes.filter(function (x) { return x.id !== id; });
  fichajesSave(data);
  renderFichajeForm();
  renderFichajeList();
}

function pagarTotalPendiente(empleadoId) {
  const data = fichajesLoad();
  const pendientes = data.fichajes.filter(function (f) { return f.empleadoId === empleadoId && f.horaSalida && !f.pagado; });
  if (pendientes.length === 0) return;

  const empData = empleadosLoad();
  const emp = empData.empleados.find(function (e) { return e.id === empleadoId; });
  const total = pendientes.reduce(function (a, f) { return a + f.monto; }, 0);

  const metodo = prompt("¿Con qué método le pagás a " + (emp ? emp.nombre : "") + "? (" + getMetodosPago().join(" / ") + ")", "Efectivo");
  if (!metodo) return;

  cajaAddTransaction({
    type: "egreso",
    ledger: "principal",
    date: cajaTodayStr(),
    category: "Sueldos y cargas sociales",
    method: metodo,
    amount: total,
    note: "Pago a " + (emp ? emp.nombre : "empleado") + " — " + pendientes.length + " turno(s) pendientes",
  });

  pendientes.forEach(function (f) { f.pagado = true; });
  fichajesSave(data);
  renderFichajeList();
  alert("Pagado " + cajaFmtMoney(total) + " en total. Registrado en Caja como egreso.");
}

function renderFichajeList() {
  const card = document.getElementById("fichaje-list-card");
  if (!card) return;

  const empData = empleadosLoad();
  const data = fichajesLoad();
  const lista = data.fichajes.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : (a.horaEntrada < b.horaEntrada ? 1 : -1); });

  if (lista.length === 0) {
    card.innerHTML = '<div class="empty-note">Todavía no hay fichadas cargadas.</div>';
    return;
  }

  // Total pendiente por empleado, con botón de pago único
  let html = '<div class="stat-label" style="margin-bottom:8px;">Pendiente de pago por empleado</div>';
  empData.empleados.forEach(function (e) {
    const pendientes = data.fichajes.filter(function (f) { return f.empleadoId === e.id && f.horaSalida && !f.pagado; });
    if (pendientes.length === 0) return;
    const total = pendientes.reduce(function (a, f) { return a + f.monto; }, 0);
    html += '<div class="data-row">';
    html += '<span style="flex:1;">' + escapeHtml(e.nombre) + ' <span class="stat-sub">(' + pendientes.length + ' turno' + (pendientes.length > 1 ? "s" : "") + ')</span></span>';
    html += '<span style="font-family:\'Courier New\',monospace;">' + cajaFmtMoney(total) + '</span>';
    html += '<button class="caja-btn caja-btn-primary" style="padding:6px 14px; font-size:0.78rem;" onclick="pagarTotalPendiente(\'' + e.id + '\')">Pagar total</button>';
    html += '</div>';
  });

  html += '<div class="stat-label" style="margin:16px 0 8px;">Historial de fichadas</div>';
  lista.forEach(function (f) {
    const emp = empData.empleados.find(function (e) { return e.id === f.empleadoId; });
    html += '<div class="data-row">';
    html += '<span style="flex:1;">';
    html += '<strong>' + escapeHtml(emp ? emp.nombre : "(empleado borrado)") + '</strong><br>';
    html += '<span class="stat-sub">' + cajaFmtDateLabel(f.fecha) + ' &middot; ' + f.horaEntrada + ' - ' + (f.horaSalida || "en curso") + (f.horas != null ? ' (' + f.horas.toFixed(2) + 'hs)' : '') + '</span>';
    html += '</span>';
    if (f.monto != null) html += '<span style="font-family:\'Courier New\',monospace; font-size:0.85rem;">' + cajaFmtMoney(f.monto) + '</span>';
    if (f.pagado) html += '<span class="stat-sub" style="color:#5fa372;">Pagado</span>';
    else html += '<button class="mov-del" onclick="editarFichajeManual(\'' + f.id + '\')"><i class="fa-solid fa-pen"></i></button>';
    html += '<button class="mov-del" onclick="borrarFichaje(\'' + f.id + '\')"><i class="fa-solid fa-trash"></i></button>';
    html += '</div>';
  });

  card.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function () {
  cajaAplicarTema();
  cajaInitNavDropdown();
  document.querySelectorAll(".caja-tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setEmpTab(btn.dataset.tab); });
  });
  renderEmpForm();
  renderEmpList();
});
