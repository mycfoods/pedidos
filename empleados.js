/* =========================================================
   MYCFOODS · EMPLEADOS — personal, roles y PIN de acceso
   Requiere caja-core.js cargado antes.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

let empEditingId = null;
const ROLES = ["Mozo/a", "Cocina", "Cajero/a", "Delivery", "Administración"];

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
  html += '<input class="caja-input" id="emp-pin" style="flex:1;" placeholder="PIN de acceso (4 dígitos, opcional)" maxlength="6" value="' + (editing ? escapeHtml(editing.pin || "") : "") + '">';
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
    if (e.pin) html += '<span style="font-family:\'Courier New\',monospace; font-size:0.8rem; color:var(--text-gray);">PIN ' + escapeHtml(e.pin) + '</span>';
    html += '<button class="mov-del" onclick="editarEmpleado(\'' + e.id + '\')"><i class="fa-solid fa-pen"></i></button>';
    html += '<button class="mov-del" onclick="borrarEmpleado(\'' + e.id + '\')"><i class="fa-solid fa-trash"></i></button>';
    html += '</div>';
  });

  card.innerHTML = html;
}

function editarEmpleado(id) {
  empEditingId = id;
  renderEmpForm();
}

function cancelarEdicionEmp() {
  empEditingId = null;
  renderEmpForm();
}

function guardarEmpleado() {
  const nombre = document.getElementById("emp-nombre").value.trim();
  const rol = document.getElementById("emp-rol").value;
  const pin = document.getElementById("emp-pin").value.trim();

  if (!nombre) { alert("Ingresá un nombre."); return; }

  const data = empleadosLoad();
  if (empEditingId) {
    const e = data.empleados.find(function (x) { return x.id === empEditingId; });
    if (e) { e.nombre = nombre; e.rol = rol; e.pin = pin; }
    empEditingId = null;
  } else {
    data.empleados.push({ id: cajaUid(), nombre: nombre, rol: rol, pin: pin, activo: true });
  }
  empleadosSave(data);
  renderEmpForm();
  renderEmpList();
}

function borrarEmpleado(id) {
  if (!confirm("¿Borrar este empleado?")) return;
  const data = empleadosLoad();
  data.empleados = data.empleados.filter(function (x) { return x.id !== id; });
  empleadosSave(data);
  if (empEditingId === id) empEditingId = null;
  renderEmpForm();
  renderEmpList();
}

document.addEventListener("DOMContentLoaded", function () {
  renderEmpForm();
  renderEmpList();
});
