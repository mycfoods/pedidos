/* =========================================================
   MYCFOODS · CONFIGURACIÓN — centro de ajustes del POS
   Requiere caja-core.js cargado antes.
   Todo lo que se cambia acá se aplica solo, sin tocar código,
   en index.html, caja.html, salon.html, etc.
========================================================= */

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function renderConfig() {
  const el = document.getElementById("config-content");
  if (!el) return;

  const site = siteLoad();
  const cajaData = cajaLoad();

  let html = "";

  // --- Datos del negocio ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Datos del negocio</div>';
  html += '<div class="caja-field" style="margin-bottom:10px;"><label>Nombre del negocio (sale en tickets y reportes)</label><input class="caja-input" value="' + escapeHtml(cajaData.businessName || "") + '" onchange="actualizarNombreNegocio(this.value)"></div>';
  html += '<div class="caja-row" style="margin-bottom:10px;">';
  html += '<div class="caja-field"><label>CUIT</label><input class="caja-input" value="' + escapeHtml(site.cuit) + '" onchange="actualizarSitio(\'cuit\', this.value)"></div>';
  html += '<div class="caja-field"><label>Teléfono</label><input class="caja-input" value="' + escapeHtml(site.telefono) + '" onchange="actualizarSitio(\'telefono\', this.value)"></div>';
  html += '</div>';
  html += '<div class="caja-field" style="margin-bottom:10px;"><label>Dirección del local</label><input class="caja-input" value="' + escapeHtml(site.direccion) + '" onchange="actualizarSitio(\'direccion\', this.value)"></div>';
  html += '<div class="caja-field"><label>WhatsApp de contacto</label><input class="caja-input" placeholder="Ej: 5491122334455 (con código de país, sin espacios)" value="' + escapeHtml(site.whatsapp) + '" onchange="actualizarSitio(\'whatsapp\', this.value)"></div>';
  html += '<div class="stat-sub" style="margin-top:6px;">Si completás el WhatsApp, aparece un botón flotante en la página de pedidos.</div>';
  html += '</div>';

  // --- Portada ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Textos arriba del menú</div>';
  html += '<input class="caja-input" placeholder="Subtítulo chico (ej: NUESTRA CARTA)" value="' + escapeHtml(site.heroSubtitulo) + '" onchange="actualizarSitio(\'heroSubtitulo\', this.value)" style="margin-bottom:10px;">';
  html += '<input class="caja-input" placeholder="Título (ej: Menú)" value="' + escapeHtml(site.heroTitulo) + '" onchange="actualizarSitio(\'heroTitulo\', this.value)" style="margin-bottom:10px;">';
  html += '<input class="caja-input" placeholder="Bajada (ej: Elegí y armá tu pedido)" value="' + escapeHtml(site.heroBajada) + '" onchange="actualizarSitio(\'heroBajada\', this.value)">';
  html += '</div>';

  // --- Entrega y horarios ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Entrega y horarios</div>';
  html += '<div class="caja-field" style="margin-bottom:10px;"><label>Texto para "Delivery"</label><input class="caja-input" value="' + escapeHtml(site.entregaDeliveryLabel) + '" onchange="actualizarSitio(\'entregaDeliveryLabel\', this.value)"></div>';
  html += '<div class="caja-field" style="margin-bottom:12px;"><label>Texto para "Retiro por local"</label><input class="caja-input" value="' + escapeHtml(site.entregaRetiroLabel) + '" onchange="actualizarSitio(\'entregaRetiroLabel\', this.value)"></div>';
  html += '<div class="caja-row">';
  html += '<div class="caja-field"><label>Horario mínimo de entrega</label><input class="caja-input" type="time" value="' + site.horarioMin + '" onchange="actualizarSitio(\'horarioMin\', this.value)"></div>';
  html += '<div class="caja-field"><label>Horario máximo de entrega</label><input class="caja-input" type="time" value="' + site.horarioMax + '" onchange="actualizarSitio(\'horarioMax\', this.value)"></div>';
  html += '</div>';
  html += '</div>';

  // --- Parámetros comerciales ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Parámetros comerciales</div>';
  html += '<div class="caja-row" style="margin-bottom:10px;">';
  html += '<div class="caja-field"><label>Costo de delivery ($)</label><input class="caja-input" type="number" value="' + site.costoDelivery + '" onchange="actualizarSitioNumero(\'costoDelivery\', this.value)"></div>';
  html += '<div class="caja-field"><label>Cubierto por persona en salón ($)</label><input class="caja-input" type="number" value="' + site.cubiertoSalon + '" onchange="actualizarSitioNumero(\'cubiertoSalon\', this.value)"></div>';
  html += '</div>';
  html += '<div class="caja-field"><label>Descuento por pago en efectivo (%)</label><input class="caja-input" type="number" value="' + site.descuentoEfectivoPct + '" onchange="actualizarSitioNumero(\'descuentoEfectivoPct\', this.value)"></div>';
  html += '<div class="stat-sub" style="margin-top:8px;">Estos valores quedan guardados como referencia; recordá aplicarlos manualmente al armar el pedido o la mesa (no se descuentan solos todavía).</div>';
  html += '</div>';

  // --- Formas de pago ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Formas de pago disponibles (en pedidos, mesas y movimientos)</div>';
  (site.metodosPago || []).forEach(function (m, i) {
    const esEfectivo = m.trim().toLowerCase() === "efectivo";
    html += '<div class="caja-row" style="align-items:center;">' +
      '<input class="caja-input" style="flex:1;" value="' + escapeHtml(m) + '" onchange="renombrarMetodoPagoConfig(' + i + ', this.value)" ' + (esEfectivo ? 'disabled title="No se puede cambiar: el saldo de caja física lo usa como referencia."' : '') + '>' +
      (esEfectivo
        ? '<span class="stat-sub" style="white-space:nowrap; padding:0 6px;" title="No se puede borrar">🔒</span>'
        : '<button class="mov-del" onclick="borrarMetodoPagoConfig(' + i + ')"><i class="fa-solid fa-trash"></i></button>') +
      '</div>';
  });
  html += '<button class="caja-btn caja-btn-ghost" onclick="agregarMetodoPagoConfig()" style="margin-top:8px;">+ Agregar forma de pago</button>';
  html += '<div class="stat-sub" style="margin-top:8px;">"Efectivo" está protegido porque el saldo físico de caja se calcula con ese nombre exacto.</div>';
  html += '</div>';

  // --- Seguridad ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Seguridad</div>';
  html += '<div class="caja-field" style="margin-bottom:10px;"><label>PIN de administrador</label><input class="caja-input" placeholder="Ej: 4 dígitos" value="' + escapeHtml(site.pinAdmin) + '" onchange="actualizarSitio(\'pinAdmin\', this.value)"></div>';
  html += '<div class="caja-row" style="align-items:center; gap:10px;">';
  html += '<input type="checkbox" id="anulacion-pin" ' + (site.anulacionSoloConPin ? "checked" : "") + ' onchange="actualizarSitioBool(\'anulacionSoloConPin\', this.checked)" style="width:auto;">';
  html += '<label for="anulacion-pin" style="font-size:0.85rem; color:var(--text-gray);">Pedir PIN para anular ventas o borrar movimientos</label>';
  html += '</div>';
  html += '<div class="stat-sub" style="margin-top:8px;">Nota: esto queda guardado como referencia del local; los botones de borrar todavía no piden el PIN automáticamente en esta versión.</div>';
  html += '</div>';

  // --- Impresoras ---
  html += '<div class="caja-card">';
  html += '<div class="stat-label" style="margin-bottom:10px;">Impresoras (informativo)</div>';
  html += '<div class="caja-field" style="margin-bottom:10px;"><label>Impresora de cocina</label><input class="caja-input" placeholder="Ej: Xprinter XP-80C - Cocina" value="' + escapeHtml(site.impresoraCocina) + '" onchange="actualizarSitio(\'impresoraCocina\', this.value)"></div>';
  html += '<div class="caja-field"><label>Impresora de caja</label><input class="caja-input" placeholder="Ej: Xprinter XP-80C - Mostrador" value="' + escapeHtml(site.impresoraCaja) + '" onchange="actualizarSitio(\'impresoraCaja\', this.value)"></div>';
  html += '<div class="stat-sub" style="margin-top:8px;">Esto es solo para que el local tenga anotado qué impresora usa cada sector — el navegador no puede configurar impresoras automáticamente por seguridad. Cuando imprimís una comanda o un ticket, elegís la impresora en el diálogo de impresión normal.</div>';
  html += '</div>';

  html += '<div class="empty-note">⚠️ Todo lo que ves acá (mesas, comandas, stock, ventas, ajustes) se guarda en el navegador de este dispositivo. Si abrís el sitio desde otro celular o computadora, no va a ver los mismos datos — no hay sincronización automática entre dispositivos todavía.</div>';

  el.innerHTML = html;
}

function actualizarSitio(campo, valor) {
  const site = siteLoad();
  site[campo] = valor;
  siteSave(site);
}

function actualizarSitioNumero(campo, valor) {
  const site = siteLoad();
  site[campo] = parseFloat(valor) || 0;
  siteSave(site);
}

function actualizarSitioBool(campo, valor) {
  const site = siteLoad();
  site[campo] = !!valor;
  siteSave(site);
}

function actualizarNombreNegocio(v) {
  const data = cajaLoad();
  data.businessName = v;
  cajaSave(data);
}

function renombrarMetodoPagoConfig(i, v) {
  const site = siteLoad();
  if ((site.metodosPago[i] || "").trim().toLowerCase() === "efectivo") return;
  site.metodosPago[i] = v;
  siteSave(site);
}

function borrarMetodoPagoConfig(i) {
  const site = siteLoad();
  if ((site.metodosPago[i] || "").trim().toLowerCase() === "efectivo") return;
  if (!confirm("¿Borrar esta forma de pago?")) return;
  site.metodosPago.splice(i, 1);
  siteSave(site);
  renderConfig();
}

function agregarMetodoPagoConfig() {
  const site = siteLoad();
  site.metodosPago.push("Nueva forma de pago");
  siteSave(site);
  renderConfig();
}

document.addEventListener("DOMContentLoaded", function () {
  renderConfig();
});
    
