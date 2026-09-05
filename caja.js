/* =========================================================
   MYCFOODS · CAJA
   Lógica de caja.html
   Requiere caja-core.js cargado antes.
========================================================= */

let state = cajaLoad();
let activeTab = "resumen";
let movFilterLedger = "todas";
let movFormType = "ingreso";
let aperturaEditing = false;
let mayorMonth = null;


/* =========================================================
   UTILIDADES
========================================================= */

function escapeHtml(s) {
    return cajaEscapeHtml(s);
}

function refreshState() {
    state = cajaLoad();
}


/* =========================================================
   PESTAÑAS
========================================================= */

function setTab(tab) {
    activeTab = tab;

    document.querySelectorAll(".caja-tab-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    document.querySelectorAll(".caja-panel").forEach(function (panel) {
        panel.classList.toggle("active", panel.id === "panel-" + tab);
    });

    renderActive();
}

function renderActive() {
    refreshState();

    if (activeTab === "resumen") {
        renderResumen();
    } else if (activeTab === "movimientos") {
        renderMovimientos();
    } else if (activeTab === "menu") {
        renderMenuAdmin();
    } else if (activeTab === "mayor") {
        renderMayor();
    } else if (activeTab === "equilibrio") {
        renderEquilibrio();
    } else if (activeTab === "reportes") {
        renderReportes();
    }
}


/* =========================================================
   RESUMEN
========================================================= */

function renderResumen() {
    const panel = document.getElementById("panel-resumen");
    if (!panel) return;

    const today = cajaTodayStr();

    const txToday = state.transactions.filter(function (t) {
        return t.date === today;
    });

    let ingresos = 0;
    let egresos = 0;

    txToday.forEach(function (t) {
        if (t.type === "ingreso") {
            ingresos += Number(t.amount) || 0;
        } else {
            egresos += Number(t.amount) || 0;
        }
    });

    const balances = cajaComputeBalances(
        state.transactions,
        state.openings
    );

    const ventas = txToday.filter(function (t) {
        return t.type === "ingreso";
    });

    const ticketPromedio = ventas.length
        ? ingresos / ventas.length
        : 0;

    const html = `
        <div class="caja-summary-grid">

            <div class="caja-summary-card">
                <div class="caja-summary-label">INGRESOS HOY</div>
                <div class="caja-summary-value">${cajaFmtMoney(ingresos)}</div>
            </div>

            <div class="caja-summary-card">
                <div class="caja-summary-label">EGRESOS HOY</div>
                <div class="caja-summary-value">${cajaFmtMoney(egresos)}</div>
            </div>

            <div class="caja-summary-card">
                <div class="caja-summary-label">RESULTADO</div>
                <div class="caja-summary-value">${cajaFmtMoney(ingresos - egresos)}</div>
            </div>

            <div class="caja-summary-card">
                <div class="caja-summary-label">TICKETS HOY</div>
                <div class="caja-summary-value">${ventas.length}</div>
            </div>

            <div class="caja-summary-card">
                <div class="caja-summary-label">TICKET PROMEDIO</div>
                <div class="caja-summary-value">${cajaFmtMoney(ticketPromedio)}</div>
            </div>

            <div class="caja-summary-card">
                <div class="caja-summary-label">CAJA PRINCIPAL</div>
                <div class="caja-summary-value">${cajaFmtMoney(balances.principal)}</div>
            </div>

        </div>

        <div class="caja-section">
            <h3>Movimientos de hoy</h3>

            ${
                txToday.length
                ? txToday.map(movRowHtml).join("")
                : '<div class="caja-empty">No hay movimientos registrados hoy.</div>'
            }
        </div>
    `;

    panel.innerHTML = html;
}


/* =========================================================
   MOVIMIENTOS
========================================================= */

function movRowHtml(t) {
    const ingreso = t.type === "ingreso";

    return `
        <div class="caja-mov-row">

            <div class="caja-mov-main">
                <strong>${escapeHtml(t.category || "")}</strong>

                <span>
                    ${escapeHtml(t.note || "")}
                </span>

                <small>
                    ${escapeHtml(t.date || "")}
                    ${t.method ? " · " + escapeHtml(t.method) : ""}
                    ${t.ledger ? " · " + escapeHtml(t.ledger) : ""}
                </small>
            </div>

            <div class="caja-mov-amount ${ingreso ? "income" : "expense"}">
                ${ingreso ? "+" : "-"}${cajaFmtMoney(t.amount)}
            </div>

        </div>
    `;
}

function renderMovimientos() {
    const panel = document.getElementById("panel-movimientos");
    if (!panel) return;

    let tx = state.transactions.slice();

    if (movFilterLedger !== "todas") {
        tx = tx.filter(function (t) {
            return t.ledger === movFilterLedger;
        });
    }

    tx.sort(function (a, b) {
        const da = (a.date || "") + (a.id || "");
        const db = (b.date || "") + (b.id || "");
        return db.localeCompare(da);
    });

    panel.innerHTML = `
        <div class="caja-section">

            <div class="caja-toolbar">

                <button
                    class="caja-action-btn"
                    onclick="mostrarFormularioMovimiento('ingreso')">
                    + Ingreso
                </button>

                <button
                    class="caja-action-btn"
                    onclick="mostrarFormularioMovimiento('egreso')">
                    + Egreso
                </button>

                <select
                    class="caja-select"
                    onchange="cambiarFiltroLedger(this.value)">
                    <option value="todas" ${movFilterLedger === "todas" ? "selected" : ""}>
                        Todas las cajas
                    </option>

                    <option value="principal" ${movFilterLedger === "principal" ? "selected" : ""}>
                        Caja principal
                    </option>

                    <option value="chica" ${movFilterLedger === "chica" ? "selected" : ""}>
                        Caja chica
                    </option>
                </select>

            </div>

            <div id="mov-form-container"></div>

            <div class="caja-mov-list">

                ${
                    tx.length
                    ? tx.map(movRowHtml).join("")
                    : '<div class="caja-empty">No hay movimientos.</div>'
                }

            </div>

        </div>
    `;
}

function cambiarFiltroLedger(value) {
    movFilterLedger = value;
    renderMovimientos();
}


/* =========================================================
   FORMULARIO MOVIMIENTO
========================================================= */

function mostrarFormularioMovimiento(type) {
    movFormType = type;

    const container = document.getElementById("mov-form-container");

    if (!container) {
        renderMovimientos();
        return;
    }

    const categories = type === "ingreso"
        ? CAJA_INCOME_CATS
        : CAJA_EXPENSE_CATS;

    container.innerHTML = `
        <div class="caja-form-card">

            <h3>
                ${type === "ingreso" ? "Registrar ingreso" : "Registrar egreso"}
            </h3>

            <div class="caja-form-grid">

                <label>
                    Monto
                    <input
                        id="mov-monto"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0">
                </label>

                <label>
                    Categoría

                    <select id="mov-categoria">
                        ${categories.map(function (c) {
                            return `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
                        }).join("")}
                    </select>
                </label>

                ${
                    type === "ingreso"
                    ? `
                    <label>
                        Forma de pago

                        <select id="mov-metodo">
                            ${CAJA_METHODS.map(function (m) {
                                return `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
                            }).join("")}
                        </select>
                    </label>
                    `
                    : ""
                }

                <label>
                    Caja

                    <select id="mov-ledger">
                        <option value="principal">Caja principal</option>
                        <option value="chica">Caja chica</option>
                    </select>
                </label>

                <label>
                    Nota

                    <input
                        id="mov-nota"
                        type="text"
                        placeholder="Detalle">
                </label>

            </div>

            <div class="caja-form-actions">

                <button
                    class="caja-action-btn"
                    onclick="guardarMovimiento()">
                    Guardar
                </button>

                <button
                    class="caja-action-btn secondary"
                    onclick="renderMovimientos()">
                    Cancelar
                </button>

            </div>

        </div>
    `;
}

function guardarMovimiento() {
    const monto = Number(
        document.getElementById("mov-monto").value
    ) || 0;

    if (monto <= 0) {
        alert("Ingresá un monto válido.");
        return;
    }

    const categoria =
        document.getElementById("mov-categoria").value;

    const ledger =
        document.getElementById("mov-ledger").value;

    const nota =
        document.getElementById("mov-nota").value.trim();

    let metodo = "";

    const metodoEl =
        document.getElementById("mov-metodo");

    if (metodoEl) {
        metodo = metodoEl.value;
    }

    cajaAddTransaction({
        type: movFormType,
        ledger: ledger,
        date: cajaTodayStr(),
        category: categoria,
        method: metodo,
        amount: monto,
        note: nota
    });

    refreshState();

    alert(
        movFormType === "ingreso"
            ? "Ingreso registrado."
            : "Egreso registrado."
    );

    renderMovimientos();
}


/* =========================================================
   APERTURA DE CAJA
========================================================= */

function guardarApertura() {
    const principalEl =
        document.getElementById("apertura-principal");

    const chicaEl =
        document.getElementById("apertura-chica");

    const principal =
        Number(principalEl ? principalEl.value : 0) || 0;

    const chica =
        Number(chicaEl ? chicaEl.value : 0) || 0;

    const today = cajaTodayStr();

    state.openings[today] = {
        principal: principal,
        chica: chica
    };

    cajaSave(state);

    refreshState();

    alert("Apertura guardada.");

    renderResumen();
}


/* =========================================================
   MENÚ
========================================================= */

function renderMenuAdmin() {
    const panel = document.getElementById("panel-menu");
    if (!panel) return;

    const menu = menuLoad();

    panel.innerHTML = `
        <div class="caja-section">

            <div class="caja-section-header">
                <div>
                    <h3>Menú</h3>
                    <p>Productos disponibles para la venta.</p>
                </div>

                <button
                    class="caja-action-btn"
                    onclick="mostrarNuevoProducto()">
                    + Producto
                </button>
            </div>

            <div id="menu-form-container"></div>

            <div class="caja-menu-list">

                ${
                    menu.products.length
                    ? menu.products.map(function (p) {
                        return `
                            <div class="caja-menu-row">

                                <div>
                                    <strong>${escapeHtml(p.name)}</strong>

                                    <small>
                                        ${escapeHtml(p.category)}
                                    </small>

                                    <span>
                                        ${escapeHtml(p.desc || "")}
                                    </span>
                                </div>

                                <div class="caja-menu-price">
                                    ${cajaFmtMoney(p.price)}
                                </div>

                            </div>
                        `;
                    }).join("")
                    : '<div class="caja-empty">No hay productos.</div>'
                }

            </div>

        </div>
    `;
}

function mostrarNuevoProducto() {
    const container =
        document.getElementById("menu-form-container");

    if (!container) return;

    container.innerHTML = `
        <div class="caja-form-card">

            <h3>Nuevo producto</h3>

            <div class="caja-form-grid">

                <label>
                    Categoría
                    <input id="menu-cat" type="text">
                </label>

                <label>
                    Nombre
                    <input id="menu-name" type="text">
                </label>

                <label>
                    Precio
                    <input id="menu-price" type="number" min="0">
                </label>

                <label>
                    Descripción
                    <input id="menu-desc" type="text">
                </label>

            </div>

            <div class="caja-form-actions">

                <button
                    class="caja-action-btn"
                    onclick="guardarNuevoProducto()">
                    Guardar
                </button>

                <button
                    class="caja-action-btn secondary"
                    onclick="renderMenuAdmin()">
                    Cancelar
                </button>

            </div>

        </div>
    `;
}

function guardarNuevoProducto() {
    const category =
        document.getElementById("menu-cat").value.trim();

    const name =
        document.getElementById("menu-name").value.trim();

    const price =
        Number(document.getElementById("menu-price").value) || 0;

    const desc =
        document.getElementById("menu-desc").value.trim();

    if (!name || price <= 0) {
        alert("Completá nombre y precio.");
        return;
    }

    const menu = menuLoad();

    menu.products.push({
        id: "p" + Date.now(),
        category: category || "Otros",
        name: name,
        price: price,
        desc: desc
    });

    menuSave(menu);

    alert("Producto agregado.");

    renderMenuAdmin();
}


/* =========================================================
   MAYOR
========================================================= */

function renderMayor() {
    const panel = document.getElementById("panel-mayor");
    if (!panel) return;

    const months = {};

    state.transactions.forEach(function (t) {
        if (!t.date) return;

        const key = cajaMonthKey(t.date);

        if (!months[key]) {
            months[key] = [];
        }

        months[key].push(t);
    });

    const monthKeys = Object.keys(months).sort().reverse();

    if (!mayorMonth) {
        mayorMonth =
            monthKeys[0] ||
            cajaTodayStr().slice(0, 7);
    }

    const monthTx =
        months[mayorMonth] || [];

    const grouped = {};

    monthTx.forEach(function (t) {

        if (!grouped[t.category]) {
            grouped[t.category] = {
                category: t.category,
                type: t.type,
                total: 0,
                count: 0
            };
        }

        grouped[t.category].total +=
            Number(t.amount) || 0;

        grouped[t.category].count += 1;
    });

    const groups = Object.values(grouped);

    const ingresos =
        monthTx
            .filter(function (t) {
                return t.type === "ingreso";
            })
            .reduce(function (sum, t) {
                return sum + (Number(t.amount) || 0);
            }, 0);

    const egresos =
        monthTx
            .filter(function (t) {
                return t.type === "egreso";
            })
            .reduce(function (sum, t) {
                return sum + (Number(t.amount) || 0);
            }, 0);

    panel.innerHTML = `
        <div class="caja-section">

            <div class="caja-section-header">

                <div>
                    <h3>Libro mayor</h3>
                    <p>
                        ${cajaMonthLabel(mayorMonth)}
                    </p>
                </div>

                <select
                    class="caja-select"
                    onchange="cambiarMayorMonth(this.value)">

                    ${
                        monthKeys.map(function (m) {
                            return `
                                <option
                                    value="${m}"
                                    ${m === mayorMonth ? "selected" : ""}>
                                    ${cajaMonthLabel(m)}
                                </option>
                            `;
                        }).join("")
                    }

                </select>

            </div>

            <div class="caja-summary-grid">

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        INGRESOS
                    </div>
                    <div class="caja-summary-value">
                        ${cajaFmtMoney(ingresos)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        EGRESOS
                    </div>
                    <div class="caja-summary-value">
                        ${cajaFmtMoney(egresos)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        RESULTADO
                    </div>
                    <div class="caja-summary-value">
                        ${cajaFmtMoney(ingresos - egresos)}
                    </div>
                </div>

            </div>

            <div class="caja-table-wrap">

                <table class="caja-table">

                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${
                            groups.map(function (g) {
                                return `
                                    <tr>
                                        <td>
                                            ${escapeHtml(g.category)}
                                        </td>

                                        <td>
                                            ${escapeHtml(g.type)}
                                        </td>

                                        <td>
                                            ${g.count}
                                        </td>

                                        <td>
                                            ${cajaFmtMoney(g.total)}
                                        </td>
                                    </tr>
                                `;
                            }).join("")
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}

function cambiarMayorMonth(value) {
    mayorMonth = value;
    renderMayor();
}


/* =========================================================
   PUNTO DE EQUILIBRIO
========================================================= */

function renderEquilibrio() {
    const panel =
        document.getElementById("panel-equilibrio");

    if (!panel) return;

    const config = state.config || {};

    const fixedCosts =
        Array.isArray(config.fixedCosts)
            ? config.fixedCosts
            : [];

    const fixedTotal =
        fixedCosts.reduce(function (sum, item) {
            return sum + (Number(item.amount) || 0);
        }, 0);

    const variablePct =
        Number(config.variablePct) || 0;

    const avgTicket =
        Number(config.avgTicket) || 0;

    let breakEven = 0;

    if (avgTicket > 0 && variablePct < 100) {
        const contribution =
            avgTicket * (1 - variablePct / 100);

        if (contribution > 0) {
            breakEven =
                Math.ceil(fixedTotal / contribution);
        }
    }

    const today =
        cajaTodayStr();

    const todaySales =
        state.transactions.filter(function (t) {
            return (
                t.date === today &&
                t.type === "ingreso"
            );
        });

    const todayRevenue =
        todaySales.reduce(function (sum, t) {
            return sum + (Number(t.amount) || 0);
        }, 0);

    const currentTicket =
        todaySales.length
            ? todayRevenue / todaySales.length
            : 0;

    panel.innerHTML = `
        <div class="caja-section">

            <h3>Punto de equilibrio</h3>

            <div class="caja-summary-grid">

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        COSTOS FIJOS
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(fixedTotal)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        COSTO VARIABLE
                    </div>

                    <div class="caja-summary-value">
                        ${variablePct}%
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        TICKET PROMEDIO
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(avgTicket)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        TICKETS PARA EQUILIBRIO
                    </div>

                    <div class="caja-summary-value">
                        ${breakEven || "-"}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        VENTAS HOY
                    </div>

                    <div class="caja-summary-value">
                        ${todaySales.length}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        TICKET REAL HOY
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(currentTicket)}
                    </div>
                </div>

            </div>

            <div class="caja-section">

                <h4>Costos fijos</h4>

                ${
                    fixedCosts.length
                    ? fixedCosts.map(function (item) {
                        return `
                            <div class="caja-mov-row">
                                <div class="caja-mov-main">
                                    <strong>
                                        ${escapeHtml(item.name || "Costo")}
                                    </strong>
                                </div>

                                <div class="caja-mov-amount expense">
                                    ${cajaFmtMoney(item.amount)}
                                </div>
                            </div>
                        `;
                    }).join("")
                    : '<div class="caja-empty">No hay costos fijos cargados.</div>'
                }

            </div>

        </div>
    `;
}


/* =========================================================
   REPORTES
========================================================= */

function renderReportes() {
    const panel =
        document.getElementById("panel-reportes");

    if (!panel) return;

    const today =
        cajaTodayStr();

    const month =
        cajaMonthKey(today);

    const monthTx =
        state.transactions.filter(function (t) {
            return t.date &&
                cajaMonthKey(t.date) === month;
        });

    const ingresos =
        monthTx
            .filter(function (t) {
                return t.type === "ingreso";
            })
            .reduce(function (sum, t) {
                return sum + (Number(t.amount) || 0);
            }, 0);

    const egresos =
        monthTx
            .filter(function (t) {
                return t.type === "egreso";
            })
            .reduce(function (sum, t) {
                return sum + (Number(t.amount) || 0);
            }, 0);

    const ventas =
        monthTx.filter(function (t) {
            return t.type === "ingreso";
        });

    const ticketPromedio =
        ventas.length
            ? ingresos / ventas.length
            : 0;

    panel.innerHTML = `
        <div class="caja-section">

            <div class="caja-section-header">

                <div>
                    <h3>Reportes</h3>
                    <p>
                        ${cajaMonthLabel(month)}
                    </p>
                </div>

                <div class="caja-toolbar">

                    <button
                        class="caja-action-btn"
                        onclick="imprimirReporteMensual()">
                        🖨 Imprimir mes
                    </button>

                    <button
                        class="caja-action-btn"
                        onclick="imprimirCierreDiario()">
                        🖨 Cierre de hoy
                    </button>

                </div>

            </div>

            <div class="caja-summary-grid">

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        INGRESOS
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(ingresos)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        EGRESOS
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(egresos)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        RESULTADO
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(ingresos - egresos)}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        TICKETS
                    </div>

                    <div class="caja-summary-value">
                        ${ventas.length}
                    </div>
                </div>

                <div class="caja-summary-card">
                    <div class="caja-summary-label">
                        TICKET PROMEDIO
                    </div>

                    <div class="caja-summary-value">
                        ${cajaFmtMoney(ticketPromedio)}
                    </div>
                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   IMPRESIÓN
========================================================= */

function abrirVentanaImpresion(htmlBody) {

    const ventana =
        window.open(
            "",
            "_blank",
            "width=400,height=600"
        );

    if (!ventana) {
        alert(
            "El navegador bloqueó la ventana de impresión."
        );
        return;
    }

    ventana.document.open();

    ventana.document.write(
        '<!DOCTYPE html>' +
        '<html>' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<title>Ticket</title>' +

        '<style>' +

        '@page{' +
            'size:80mm auto;' +
            'margin:0;' +
        '}' +

        'html,body{' +
            'width:80mm;' +
            'margin:0;' +
            'padding:0;' +
            'background:#fff;' +
        '}' +

        'body{' +
            'padding:2mm 3mm;' +
            'font-family:"Courier New",monospace;' +
            'font-size:12px;' +
            'font-weight:bold;' +
            'line-height:1.4;' +
            'color:#000;' +
        '}' +

        '.row{' +
            'display:flex;' +
            'justify-content:space-between;' +
            'margin:2px 0;' +
        '}' +

        '.divider{' +
            'border-top:1px dashed #000;' +
            'margin:6px 0;' +
        '}' +

        '.center{' +
            'text-align:center;' +
        '}' +

        '</style>' +

        '</head>' +

        '<body>' +
        htmlBody +
        '</body>' +

        '</html>'
    );

    ventana.document.close();

    setTimeout(function () {

        try {
            ventana.focus();
            ventana.print();
        } catch (e) {
            console.error(
                "Error de impresión:",
                e
            );
        }

        setTimeout(function () {

            try {
                ventana.close();
            } catch (e) {}

        }, 1200);

    }, 300);
}


/* =========================================================
   CIERRE DIARIO
========================================================= */

function imprimirCierreDiario() {

    refreshState();

    const today =
        cajaTodayStr();

    const tx =
        state.transactions.filter(function (t) {
            return t.date === today;
        });

    let ingresos = 0;
    let egresos = 0;

    tx.forEach(function (t) {

        if (t.type === "ingreso") {
            ingresos += Number(t.amount) || 0;
        } else {
            egresos += Number(t.amount) || 0;
        }

    });

    const html = `

        <div class="center">
            <strong>MYCFOODS</strong>
        </div>

        <div class="center">
            CIERRE DIARIO
        </div>

        <div class="center">
            ${cajaFmtDateLabel(today)}
        </div>

        <div class="divider"></div>

        ${tx.map(function (t) {

            return `
                <div class="row">
                    <span>
                        ${escapeHtml(t.category || "")}
                    </span>

                    <span>
                        ${t.type === "ingreso" ? "+" : "-"}
                        ${cajaFmtMoney(t.amount)}
                    </span>
                </div>
            `;

        }).join("")}

        <div class="divider"></div>

        <div class="row">
            <span>INGRESOS</span>
            <span>${cajaFmtMoney(ingresos)}</span>
        </div>

        <div class="row">
            <span>EGRESOS</span>
            <span>${cajaFmtMoney(egresos)}</span>
        </div>

        <div class="row">
            <span>RESULTADO</span>
            <span>${cajaFmtMoney(ingresos - egresos)}</span>
        </div>

        <div class="divider"></div>

        <div class="center">
            Fin del cierre
        </div>
    `;

    abrirVentanaImpresion(html);
}


/* =========================================================
   REPORTE MENSUAL
========================================================= */

function imprimirReporteMensual() {

    refreshState();

    const month =
        cajaMonthKey(cajaTodayStr());

    const tx =
        state.transactions.filter(function (t) {
            return (
                t.date &&
                cajaMonthKey(t.date) === month
            );
        });

    let ingresos = 0;
    let egresos = 0;

    tx.forEach(function (t) {

        if (t.type === "ingreso") {
            ingresos += Number(t.amount) || 0;
        } else {
            egresos += Number(t.amount) || 0;
        }

    });

    const html = `

        <div class="center">
            <strong>MYCFOODS</strong>
        </div>

        <div class="center">
            REPORTE MENSUAL
        </div>

        <div class="center">
            ${cajaMonthLabel(month)}
        </div>

        <div class="divider"></div>

        ${tx.map(function (t) {

            return `
                <div class="row">
                    <span>
                        ${escapeHtml(t.date || "")}
                    </span>

                    <span>
                        ${t.type === "ingreso" ? "+" : "-"}
                        ${cajaFmtMoney(t.amount)}
                    </span>
                </div>

                <div>
                    ${escapeHtml(t.category || "")}
                </div>
            `;

        }).join("")}

        <div class="divider"></div>

        <div class="row">
            <span>INGRESOS</span>
            <span>${cajaFmtMoney(ingresos)}</span>
        </div>

        <div class="row">
            <span>EGRESOS</span>
            <span>${cajaFmtMoney(egresos)}</span>
        </div>

        <div class="row">
            <span>RESULTADO</span>
            <span>${cajaFmtMoney(ingresos - egresos)}</span>
        </div>

    `;

    abrirVentanaImpresion(html);
}


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        document
            .querySelectorAll(".caja-tab-btn")
            .forEach(function (btn) {

                btn.addEventListener(
                    "click",
                    function () {
                        setTab(btn.dataset.tab);
                    }
                );

            });

        setTab("resumen");
    }
);
