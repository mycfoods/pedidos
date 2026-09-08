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
function renderFichajeForm() {
  const card = document.getElementById("fichaje-form-card");
  if (!card) return;

  const empData = empleadosLoad();
  const fichData = fichajesLoad();
  const editing = fichajeEditingId ? fichData.fichajes.find(function (x) { return x.id === fichajeEditingId; }) : null;

  if (empData.empleados.length === 0) {
    card.innerHTML = '<div class="empty-note">Cargá primero un empleado en la pestaña "Personal".</div>';
    return;
  }

  let html = '<div class="stat-label" style="margin-bottom:10px;">' + (editing ? "Editar fichada" : "Registrar fichada") + '</div>';
  html += '<div class="caja-row">';
  html += '<select class="caja-select" id="fich-empleado" style="flex:2;">';
  html += empData.empleados.map(function (e) {
    return '<option value="' + e.id + '"' + (editing && editing.empleadoId === e.id ? " selected" : "") + '>' + escapeHtml(e.nombre) + '</option>';
  }).join("");
  html += '</select>';
  html += '<input class="caja-input" id="fich-fecha" type="date" style="flex:1;" value="' + (editing ? editing.fecha : cajaTodayStr()) + '">';
  html += '</div>';
  html += '<div class="caja-row">';
  html += '<div class="caja-field"><label>Hora de entrada</label><input class="caja-input" id="fich-entrada" type="time" value="' + (editing ? editing.horaEntrada : "") + '" onchange="previsualizarFichaje()"></div>';
  html += '<div class="caja-field"><label>Hora de salida</label><input class="caja-input" id="fich-salida" type="time" value="' + (editing ? editing.horaSalida : "") + '" onchange="previsualizarFichaje()"></div>';
  html += '</div>';
  html += '<div id="fich-preview" class="stat-sub" style="margin:8px 0 12px;">Completá entrada y salida para calcular las horas.</div>';
  html += '<div class="caja-row">';
  html += '<button class="caja-btn caja-btn-primary" style="flex:1;" onclick="guardarFichaje()">' + (editing ? "Guardar cambios" : "+ Registrar fichada") + '</button>';
  if (editing) html += '<button class="caja-btn caja-btn-ghost" onclick="cancelarEdicionFichaje()">Cancelar</button>';
  html += '</div>';

  card.innerHTML = html;
  if (editing) previsualizarFichaje();
}

function previsualizarFichaje() {
  const entrada = document.getElementById("fich-entrada").value;
  const salida = document.getElementById("fich-salida").value;
  const empleadoId = document.getElementById("fich-empleado").value;
  const preview = document.getElementById("fich-preview");
  if (!preview) return;

  if (!entrada || !salida) { preview.textContent = "Completá entrada y salida para calcular las horas."; return; }

  const empData = empleadosLoad();
  const emp = empData.empleados.find(function (e) { return e.id === empleadoId; });
  const horas = calcularHorasTrabajadas(entrada, salida);
  const valorHora = emp ? (emp.valorHora || 0) : 0;
  const monto = horas * valorHora;

  preview.innerHTML = horas.toFixed(2) + " horas trabajadas &times; " + cajaFmtMoney(valorHora) + "/h = <strong style=\"color:var(--accent);\">" + cajaFmtMoney(monto) + "</strong>" +
    (valorHora === 0 ? " (este empleado no tiene valor por hora cargado, andá a Personal para cargarlo)" : "");
}

function guardarFichaje() {
  const empleadoId = document.getElementById("fich-empleado").value;
  const fecha = document.getElementById("fich-fecha").value || cajaTodayStr();
  const horaEntrada = document.getElementById("fich-entrada").value;
  const horaSalida = document.getElementById("fich-salida").value;

  if (!horaEntrada || !horaSalida) { alert("Completá hora de entrada y salida."); return; }

  const empData = empleadosLoad();
  const emp = empData.empleados.find(function (e) { return e.id === empleadoId; });
  const horas = calcularHorasTrabajadas(horaEntrada, horaSalida);
  const monto = horas * (emp ? (emp.valorHora || 0) : 0);

  const data = fichajesLoad();
  if (fichajeEditingId) {
    const f = data.fichajes.find(function (x) { return x.id === fichajeEditingId; });
    if (f && !f.pagado) {
      f.empleadoId = empleadoId; f.fecha = fecha; f.horaEntrada = horaEntrada; f.horaSalida = horaSalida;
      f.horas = horas; f.monto = monto;
    } else if (f && f.pagado) {
      alert("Esta fichada ya está pagada, no se puede editar. Si te equivocaste, borrala y cargala de nuevo.");
    }
    fichajeEditingId = null;
  } else {
    data.fichajes.push({ id: cajaUid(), empleadoId: empleadoId, fecha: fecha, horaEntrada: horaEntrada, horaSalida: horaSalida, horas: horas, monto: monto, pagado: false, transaccionId: null });
  }
  fichajesSave(data);
  renderFichajeForm();
  renderFichajeList();
}

function editarFichaje(id) {
  const data = fichajesLoad();
  const f = data.fichajes.find(function (x) { return x.id === id; });
  if (f && f.pagado) { alert("Esta fichada ya está pagada y no se puede editar."); return; }
  fichajeEditingId = id;
  renderFichajeForm();
}

function cancelarEdicionFichaje() { fichajeEditingId = null; renderFichajeForm(); }

function borrarFichaje(id) {
  if (!confirm("¿Borrar esta fichada?")) return;
  const data = fichajesLoad();
  data.fichajes = data.fichajes.filter(function (x) { return x.id !== id; });
  fichajesSave(data);
  renderFichajeList();
}

function pagarFichaje(id) {
  const data = fichajesLoad();
  const f = data.fichajes.find(function (x) { return x.id === id; });
  if (!f || f.pagado) return;

  const empData = empleadosLoad();
  const emp = empData.empleados.find(function (e) { return e.id === f.empleadoId; });
  const metodo = prompt("¿Con qué método le pagás? (" + getMetodosPago().join(" / ") + ")", "Efectivo");
  if (!metodo) return;

  cajaAddTransaction({
    type: "egreso",
    ledger: "principal",
    date: cajaTodayStr(),
    category: "Sueldos y cargas sociales",
    method: metodo,
    amount: f.monto,
    note: "Pago a " + (emp ? emp.nombre : "empleado") + " — turno " + f.fecha + " (" + f.horas.toFixed(2) + "hs)",
  });

  f.pagado = true;
  fichajesSave(data);
  renderFichajeList();
  alert("Pago registrado en Caja como egreso.");
}

function renderFichajeList() {
  const card = document.getElementById("fichaje-list-card");
  if (!card) return;

  const empData = empleadosLoad();
  const data = fichajesLoad();
  const lista = data.fichajes.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });

  if (lista.length === 0) {
    card.innerHTML = '<div class="empty-note">Todavía no hay fichadas cargadas.</div>';
    return;
  }

  const pendientes = lista.filter(function (f) { return !f.pagado; });
  const totalPendiente = pendientes.reduce(function (a, f) { return a + f.monto; }, 0);

  let html = '<div class="stat-label" style="margin-bottom:10px;">Fichadas — total pendiente de pago: <span style="color:var(--accent); font-family:\'Courier New\',monospace;">' + cajaFmtMoney(totalPendiente) + '</span></div>';

  lista.forEach(function (f) {
    const emp = empData.empleados.find(function (e) { return e.id === f.empleadoId; });
    html += '<div class="data-row">';
    html += '<span style="flex:1;">';
    html += '<strong>' + escapeHtml(emp ? emp.nombre : "(empleado borrado)") + '</strong><br>';
    html += '<span class="stat-sub">' + cajaFmtDateLabel(f.fecha) + ' &middot; ' + f.horaEntrada + '-' + f.horaSalida + ' (' + f.horas.toFixed(2) + 'hs)</span>';
    html += '</span>';
    html += '<span style="font-family:\'Courier New\',monospace; font-size:0.85rem;">' + cajaFmtMoney(f.monto) + '</span>';
    if (f.pagado) {
      html += '<span class="stat-sub" style="color:#5fa372;">Pagado</span>';
    } else {
      html += '<button class="caja-btn caja-btn-primary" style="padding:6px 12px; font-size:0.75rem;" onclick="pagarFichaje(\'' + f.id + '\')">Pagar</button>';
      html += '<button class="mov-del" onclick="editarFichaje(\'' + f.id + '\')"><i class="fa-solid fa-pen"></i></button>';
    }
    html += '<button class="mov-del" onclick="borrarFichaje(\'' + f.id + '\')"><i class="fa-solid fa-trash"></i></button>';
    html += '</div>';
  });

  card.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", function () {
  cajaAplicarTema();
  document.querySelectorAll(".caja-tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { setEmpTab(btn.dataset.tab); });
  });
  renderEmpForm();
  renderEmpList();
});
