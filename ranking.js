/* =========================================================
   MYCFOODS · RANKING — productos más y menos vendidos,
   con detalle día a día por producto.
   Requiere caja-core.js cargado antes.
   Solo cuenta ventas hechas desde Pedidos o Salón (con detalle
   de productos guardado); cargas manuales en Movimientos no
   tienen desglose por producto.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function poblarSelectorMeses() {
  const data = cajaLoad();
  const mesesSet = {};
  data.transactions.forEach(function (t) { if (t.items && t.items.length) mesesSet[cajaMonthKey(t.date)] = true; });
  mesesSet[cajaMonthKey(cajaTodayStr())] = true;
  const meses = Object.keys(mesesSet).sort().reverse();

  const sel = document.getElementById("ranking-mes");
  sel.innerHTML = meses.map(function (m) { return '<option value="' + m + '">' + cajaMonthLabel(m) + '</option>'; }).join("");
}

function renderRanking() {
  const data = cajaLoad();
  const mes = document.getElementById("ranking-mes").value;
  const orden = document.getElementById("ranking-orden").value;

  const lista = cajaProductRanking(data.transactions, { desde: mes + "-01", hasta: mes + "-31" });
  lista.sort(function (a, b) { return orden === "total" ? b.total - a.total : b.cantidad - a.cantidad; });

  const totalUnidades = lista.reduce(function (a, r) { return a + r.cantidad; }, 0);
  const totalFacturado = lista.reduce(function (a, r) { return a + r.total; }, 0);

  document.getElementById("ranking-resumen").innerHTML =
    '<div class="stat-grid" style="margin-bottom:0;">' +
    '<div class="stat-card"><div class="stat-label">Productos distintos</div><div class="stat-value">' + lista.length + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Unidades vendidas</div><div class="stat-value">' + totalUnidades + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Total facturado</div><div class="stat-value up">' + cajaFmtMoney(totalFacturado) + '</div></div>' +
    '</div>';

  const maxVal = Math.max(1, lista.length ? (orden === "total" ? lista[0].total : lista[0].cantidad) : 0);

  function filaHtml(r, i, offsetLabel) {
    const val = orden === "total" ? r.total : r.cantidad;
    return '<div style="margin-bottom:10px; cursor:pointer;" onclick="abrirDetalleProducto(\'' + r.nombre.replace(/'/g, "\\'") + '\')">' +
      '<div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:3px;">' +
      '<span style="color:var(--text-white);">' + (offsetLabel != null ? offsetLabel : (i + 1) + '.') + ' ' + escapeHtml(r.nombre) + '</span>' +
      '<span style="font-family:\'Courier New\',monospace; color:var(--text-gray);">' + r.cantidad + ' un. &middot; ' + cajaFmtMoney(r.total) + '</span>' +
      '</div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + (val / maxVal * 100) + '%"></div></div>' +
      '</div>';
  }

  const topEl = document.getElementById("ranking-top");
  const bottomEl = document.getElementById("ranking-bottom");

  if (lista.length === 0) {
    topEl.innerHTML = '<div class="empty-note">Sin ventas con detalle de productos este mes.</div>';
    bottomEl.innerHTML = '<div class="empty-note">&mdash;</div>';
    return;
  }

  topEl.innerHTML = lista.slice(0, 10).map(function (r, i) { return filaHtml(r, i); }).join("");

  if (lista.length > 5) {
    bottomEl.innerHTML = lista.slice(-5).reverse().map(function (r) { return filaHtml(r, 0, "&#9660;"); }).join("");
  } else {
    bottomEl.innerHTML = '<div class="empty-note">Necesitás más de 5 productos distintos vendidos este mes para mostrar un ranking de "menos vendidos" separado.</div>';
  }
}

/* =========================================================
   DETALLE POR PRODUCTO — día a día dentro del mes elegido
========================================================= */
function abrirDetalleProducto(nombre) {
  const data = cajaLoad();
  const mes = document.getElementById("ranking-mes").value;

  const porDia = {};
  data.transactions.forEach(function (t) {
    if (cajaMonthKey(t.date) !== mes || !t.items) return;
    t.items.forEach(function (it) {
      if (it.nombre !== nombre) return;
      if (!porDia[t.date]) porDia[t.date] = { fecha: t.date, cantidad: 0, total: 0 };
      porDia[t.date].cantidad += it.cantidad;
      porDia[t.date].total += it.precio * it.cantidad;
    });
  });

  const dias = Object.keys(porDia).map(function (k) { return porDia[k]; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  const mejorDia = dias.reduce(function (best, d) { return (!best || d.cantidad > best.cantidad) ? d : best; }, null);
  const totalCantidad = dias.reduce(function (a, d) { return a + d.cantidad; }, 0);
  const totalFacturado = dias.reduce(function (a, d) { return a + d.total; }, 0);
  const maxDia = Math.max(1, mejorDia ? mejorDia.cantidad : 0);

  let html = '<div class="mc-modal-title"><h3>' + escapeHtml(nombre) + '</h3><button class="mc-modal-close" onclick="cerrarDetalleProducto()"><i class="fa-solid fa-xmark"></i></button></div>';
  html += '<div class="mc-detail-row"><span>Total del mes</span><span>' + totalCantidad + ' un. &middot; ' + cajaFmtMoney(totalFacturado) + '</span></div>';
  if (mejorDia) {
    html += '<div class="mc-detail-row"><span>Mejor día</span><span>' + cajaFmtDateLabel(mejorDia.fecha) + ' (' + mejorDia.cantidad + ' un.)</span></div>';
  }
  html += '<div class="stat-label" style="margin:14px 0 8px;">Por día</div>';

  if (dias.length === 0) {
    html += '<div class="empty-note">Sin ventas este mes.</div>';
  } else {
    dias.forEach(function (d) {
      html += '<div style="margin-bottom:8px;">' +
        '<div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:3px;"><span style="color:var(--text-gray);">' + cajaFmtDateLabel(d.fecha) + (d.fecha === mejorDia.fecha ? ' ⭐' : '') + '</span><span style="font-family:\'Courier New\',monospace;">' + d.cantidad + ' un. &middot; ' + cajaFmtMoney(d.total) + '</span></div>' +
        '<div class="progress-track"><div class="progress-fill ' + (d.fecha === mejorDia.fecha ? "done" : "") + '" style="width:' + (d.cantidad / maxDia * 100) + '%"></div></div>' +
        '</div>';
    });
  }

  document.getElementById("producto-modal-content").innerHTML = html;
  document.getElementById("producto-modal").classList.add("open");
}

function cerrarDetalleProducto() {
  document.getElementById("producto-modal").classList.remove("open");
}

document.addEventListener("DOMContentLoaded", function () {
  poblarSelectorMeses();
  renderRanking();
});
