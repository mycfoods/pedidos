/* =========================================================
MYCFOODS · CAJA
Lógica de caja.html
Compatible con el CAJA.CSS ORIGINAL
Requiere caja-core.js cargado antes.
========================================================= */

let state = cajaLoad();
let activeTab = "resumen";
let movFilterLedger = "todas";
let movFormType = "ingreso";
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

function money(n) {
return cajaFmtMoney(n);
}

/* =========================================================
PESTAÑAS
========================================================= */

function setTab(tab) {

```
activeTab = tab;

document
    .querySelectorAll(".caja-tab-btn")
    .forEach(function (btn) {

        btn.classList.toggle(
            "active",
            btn.dataset.tab === tab
        );

    });

document
    .querySelectorAll(".caja-panel")
    .forEach(function (panel) {

        panel.classList.toggle(
            "active",
            panel.id === "panel-" + tab
        );

    });

renderActive();
```

}

function renderActive() {

```
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
```

}

/* =========================================================
RESUMEN
========================================================= */

function renderResumen() {

```
const panel =
    document.getElementById("panel-resumen");

if (!panel) return;

const today =
    cajaTodayStr();

const txToday =
    state.transactions.filter(function (t) {
        return t.date === today;
    });

let ingresos = 0;
let egresos = 0;

txToday.forEach(function (t) {

    const amount =
        Number(t.amount) || 0;

    if (t.type === "ingreso") {

        ingresos += amount;

    } else {

        egresos += amount;
    }
});

const ventas =
    txToday.filter(function (t) {
        return t.type === "ingreso";
    });

const ticketPromedio =
    ventas.length
        ? ingresos / ventas.length
        : 0;

const balances =
    cajaComputeBalances(
        state.transactions,
        state.openings
    );

panel.innerHTML = `

    <div class="stat-grid">

        <div class="stat-card">
            <div class="stat-label">
                INGRESOS HOY
            </div>

            <div class="stat-value up">
                ${money(ingresos)}
            </div>

            <div class="stat-sub">
                Ventas registradas
            </div>
        </div>


        <div class="stat-card">
            <div class="stat-label">
                EGRESOS HOY
            </div>

            <div class="stat-value down">
                ${money(egresos)}
            </div>

            <div class="stat-sub">
                Gastos registrados
            </div>
        </div>


        <div class="stat-card">
            <div class="stat-label">
                RESULTADO
            </div>

            <div class="stat-value ${
                ingresos - egresos >= 0
                    ? "up"
                    : "down"
            }">
                ${money(ingresos - egresos)}
            </div>

            <div class="stat-sub">
                Ingresos menos egresos
            </div>
        </div>


        <div class="stat-card">
            <div class="stat-label">
                TICKETS
            </div>

            <div class="stat-value">
                ${ventas.length}
            </div>

            <div class="stat-sub">
                Ventas del día
            </div>
        </div>


        <div class="stat-card">
            <div class="stat-label">
                TICKET PROMEDIO
            </div>

            <div class="stat-value">
                ${money(ticketPromedio)}
            </div>

            <div class="stat-sub">
                Promedio por venta
            </div>
        </div>


        <div class="stat-card">
            <div class="stat-label">
                CAJA PRINCIPAL
            </div>

            <div class="stat-value">
                ${money(balances.principal)}
            </div>

            <div class="stat-sub">
                Saldo acumulado
            </div>
        </div>

    </div>


    <div class="caja-card">

        <div class="caja-section-title">
            <h2>Movimientos de hoy</h2>

            <span class="stat-sub">
                ${cajaFmtDateLabel(today)}
            </span>
        </div>


        ${
            txToday.length
                ? txToday
                    .slice()
                    .reverse()
                    .map(movRowHtml)
                    .join("")
                : `
                    <div class="empty-note">
                        No hay movimientos registrados hoy.
                    </div>
                `
        }

    </div>

`;
```

}

/* =========================================================
FILA DE MOVIMIENTO
========================================================= */

function movRowHtml(t) {

```
const ingreso =
    t.type === "ingreso";

const icon =
    ingreso
        ? "+"
        : "−";

return `

    <div class="mov-row">

        <div class="mov-icon ${
            ingreso ? "in" : "out"
        }">
            ${icon}
        </div>


        <div style="flex:1; min-width:0;">

            <div class="mov-cat">
                ${escapeHtml(
                    t.category || "Movimiento"
                )}
            </div>


            <div class="mov-meta">

                ${escapeHtml(
                    t.note || ""
                )}

                ${t.date
                    ? " · " +
                      escapeHtml(
                          cajaFmtDateLabel(t.date)
                      )
                    : ""
                }

                ${t.method
                    ? " · " +
                      escapeHtml(t.method)
                    : ""
                }

                ${t.ledger
                    ? " · " +
                      escapeHtml(
                          t.ledger === "principal"
                              ? "Caja principal"
                              : "Caja chica"
                      )
                    : ""
                }

            </div>

        </div>


        <div class="mov-amount ${
            ingreso ? "in" : "out"
        }">

            ${ingreso ? "+" : "-"}
            ${money(t.amount)}

        </div>

    </div>

`;
```

}

/* =========================================================
MOVIMIENTOS
========================================================= */

function renderMovimientos() {

```
const panel =
    document.getElementById(
        "panel-movimientos"
    );

if (!panel) return;

let tx =
    state.transactions.slice();

if (movFilterLedger !== "todas") {

    tx =
        tx.filter(function (t) {
            return (
                t.ledger ===
                movFilterLedger
            );
        });
}

tx.sort(function (a, b) {

    const da =
        (a.date || "") +
        (a.id || "");

    const db =
        (b.date || "") +
        (b.id || "");

    return db.localeCompare(da);
});


panel.innerHTML = `

    <div class="caja-section-title">

        <h2>Movimientos</h2>

        <div class="caja-row">

            <button
                class="caja-btn caja-btn-primary"
                onclick="mostrarFormularioMovimiento('ingreso')">

                <i class="fa-solid fa-plus"></i>
                Ingreso

            </button>


            <button
                class="caja-btn caja-btn-ghost"
                onclick="mostrarFormularioMovimiento('egreso')">

                <i class="fa-solid fa-minus"></i>
                Egreso

            </button>

        </div>

    </div>


    <div class="caja-card">

        <div class="caja-row">

            <button
                class="chip ${
                    movFilterLedger === "todas"
                        ? "active"
                        : ""
                }"
                onclick="cambiarFiltroLedger('todas')">

                Todas

            </button>


            <button
                class="chip ${
                    movFilterLedger === "principal"
                        ? "active"
                        : ""
                }"
                onclick="cambiarFiltroLedger('principal')">

                Caja principal

            </button>


            <button
                class="chip ${
                    movFilterLedger === "chica"
                        ? "active"
                        : ""
                }"
                onclick="cambiarFiltroLedger('chica')">

                Caja chica

            </button>

        </div>


        <div id="mov-form-container"></div>


        ${
            tx.length
                ? tx.map(movRowHtml).join("")
                : `
                    <div class="empty-note">
                        No hay movimientos registrados.
                    </div>
                `
        }

    </div>

`;
```

}

function cambiarFiltroLedger(value) {

```
movFilterLedger =
    value;

renderMovimientos();
```

}

/* =========================================================
FORMULARIO DE MOVIMIENTO
========================================================= */

function mostrarFormularioMovimiento(type) {

```
movFormType =
    type;

const container =
    document.getElementById(
        "mov-form-container"
    );

if (!container) {

    renderMovimientos();

    return;
}

const categories =
    type === "ingreso"
        ? CAJA_INCOME_CATS
        : CAJA_EXPENSE_CATS;


container.innerHTML = `

    <div class="caja-card">

        <div class="caja-section-title">

            <h2>
                ${
                    type === "ingreso"
                        ? "Registrar ingreso"
                        : "Registrar egreso"
                }
            </h2>

        </div>


        <div class="caja-row">


            <div class="caja-field">

                <label>
                    Monto
                </label>

                <input
                    class="caja-input"
                    id="mov-monto"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    autofocus
                >

            </div>


            <div class="caja-field">

                <label>
                    Categoría
                </label>

                <select
                    class="caja-select"
                    id="mov-categoria">

                    ${categories.map(function (c) {

                        return `
                            <option value="${escapeHtml(c)}">
                                ${escapeHtml(c)}
                            </option>
                        `;

                    }).join("")}

                </select>

            </div>


            ${
                type === "ingreso"
                    ? `

                    <div class="caja-field">

                        <label>
                            Forma de pago
                        </label>

                        <select
                            class="caja-select"
                            id="mov-metodo">

                            ${CAJA_METHODS.map(
                                function (m) {

                                    return `
                                        <option value="${escapeHtml(m)}">
                                            ${escapeHtml(m)}
                                        </option>
                                    `;

                                }
                            ).join("")}

                        </select>

                    </div>

                    `
                    : ""
            }


            <div class="caja-field">

                <label>
                    Caja
                </label>

                <select
                    class="caja-select"
                    id="mov-ledger">

                    <option value="principal">
                        Caja principal
                    </option>

                    <option value="chica">
                        Caja chica
                    </option>

                </select>

            </div>


            <div class="caja-field">

                <label>
                    Nota
                </label>

                <input
                    class="caja-input"
                    id="mov-nota"
                    type="text"
                    placeholder="Detalle"
                >

            </div>

        </div>


        <div class="caja-row">

            <button
                class="caja-btn caja-btn-primary"
                onclick="guardarMovimiento()">

                <i class="fa-solid fa-check"></i>
                Guardar

            </button>


            <button
                class="caja-btn caja-btn-ghost"
                onclick="renderMovimientos()">

                Cancelar

            </button>

        </div>

    </div>

`;
```

}

function guardarMovimiento() {

```
const montoEl =
    document.getElementById(
        "mov-monto"
    );

const monto =
    Number(
        montoEl
            ? montoEl.value
            : 0
    ) || 0;


if (monto <= 0) {

    alert(
        "Ingresá un monto válido."
    );

    return;
}


const categoriaEl =
    document.getElementById(
        "mov-categoria"
    );

const ledgerEl =
    document.getElementById(
        "mov-ledger"
    );

const notaEl =
    document.getElementById(
        "mov-nota"
    );

const metodoEl =
    document.getElementById(
        "mov-metodo"
    );


cajaAddTransaction({

    type:
        movFormType,

    ledger:
        ledgerEl
            ? ledgerEl.value
            : "principal",

    date:
        cajaTodayStr(),

    category:
        categoriaEl
            ? categoriaEl.value
            : "",

    method:
        metodoEl
            ? metodoEl.value
            : "",

    amount:
        monto,

    note:
        notaEl
            ? notaEl.value.trim()
            : ""

});


refreshState();

renderMovimientos();
```

}

/* =========================================================
APERTURA DE CAJA
========================================================= */

function guardarApertura() {

```
const principalEl =
    document.getElementById(
        "apertura-principal"
    );

const chicaEl =
    document.getElementById(
        "apertura-chica"
    );

const principal =
    Number(
        principalEl
            ? principalEl.value
            : 0
    ) || 0;

const chica =
    Number(
        chicaEl
            ? chicaEl.value
            : 0
    ) || 0;


const today =
    cajaTodayStr();


state.openings[today] = {

    principal:
        principal,

    chica:
        chica
};


cajaSave(state);

refreshState();

renderResumen();
```

}

/* =========================================================
MENÚ
========================================================= */

function renderMenuAdmin() {

```
const panel =
    document.getElementById(
        "panel-menu"
    );

if (!panel) return;

const menu =
    menuLoad();


const grouped = {};


menu.products.forEach(function (p) {

    const category =
        p.category || "Otros";

    if (!grouped[category]) {

        grouped[category] = [];
    }

    grouped[category].push(p);
});


panel.innerHTML = `

    <div class="caja-section-title">

        <h2>Menú</h2>

        <button
            class="caja-btn caja-btn-primary"
            onclick="mostrarNuevoProducto()">

            <i class="fa-solid fa-plus"></i>
            Producto

        </button>

    </div>


    <div class="caja-card">

        <div id="menu-form-container"></div>


        ${
            Object.keys(grouped).length

                ? Object.keys(grouped)
                    .map(function (category) {

                        return `

                            <div class="ledger-group">

                                <div class="ledger-group-title">

                                    <span>
                                        ${escapeHtml(category)}
                                    </span>

                                    <span>
                                        ${grouped[category].length}
                                    </span>

                                </div>


                                ${
                                    grouped[category]
                                        .map(function (p) {

                                            return `

                                                <div class="ledger-line">

                                                    <span>

                                                        <strong style="color:var(--text-white);">
                                                            ${escapeHtml(p.name)}
                                                        </strong>

                                                        ${
                                                            p.desc
                                                                ? `
                                                                    <br>
                                                                    <small>
                                                                        ${escapeHtml(p.desc)}
                                                                    </small>
                                                                  `
                                                                : ""
                                                        }

                                                    </span>


                                                    <span>
                                                        ${money(p.price)}
                                                    </span>

                                                </div>

                                            `;

                                        })
                                        .join("")
                                }

                            </div>

                        `;

                    })
                    .join("")

                : `
                    <div class="empty-note">
                        No hay productos cargados.
                    </div>
                `
        }

    </div>

`;
```

}

function mostrarNuevoProducto() {

```
const container =
    document.getElementById(
        "menu-form-container"
    );

if (!container) return;


container.innerHTML = `

    <div class="caja-card">

        <div class="caja-section-title">

            <h2>
                Nuevo producto
            </h2>

        </div>


        <div class="caja-row">


            <div class="caja-field">

                <label>
                    Categoría
                </label>

                <input
                    class="caja-input"
                    id="menu-cat"
                    type="text"
                    placeholder="Ej. Minutas"
                >

            </div>


            <div class="caja-field">

                <label>
                    Nombre
                </label>

                <input
                    class="caja-input"
                    id="menu-name"
                    type="text"
                    placeholder="Nombre del producto"
                >

            </div>


            <div class="caja-field">

                <label>
                    Precio
                </label>

                <input
                    class="caja-input"
                    id="menu-price"
                    type="number"
                    min="0"
                    placeholder="0"
                >

            </div>


            <div class="caja-field">

                <label>
                    Descripción
                </label>

                <input
                    class="caja-input"
                    id="menu-desc"
                    type="text"
                    placeholder="Descripción"
                >

            </div>

        </div>


        <div class="caja-row">

            <button
                class="caja-btn caja-btn-primary"
                onclick="guardarNuevoProducto()">

                Guardar

            </button>


            <button
                class="caja-btn caja-btn-ghost"
                onclick="renderMenuAdmin()">

                Cancelar

            </button>

        </div>

    </div>

`;
```

}

function guardarNuevoProducto() {

```
const catEl =
    document.getElementById(
        "menu-cat"
    );

const nameEl =
    document.getElementById(
        "menu-name"
    );

const priceEl =
    document.getElementById(
        "menu-price"
    );

const descEl =
    document.getElementById(
        "menu-desc"
    );


const category =
    catEl
        ? catEl.value.trim()
        : "";

const name =
    nameEl
        ? nameEl.value.trim()
        : "";

const price =
    Number(
        priceEl
            ? priceEl.value
            : 0
    ) || 0;

const desc =
    descEl
        ? descEl.value.trim()
        : "";


if (!name || price <= 0) {

    alert(
        "Completá nombre y precio."
    );

    return;
}


const menu =
    menuLoad();


menu.products.push({

    id:
        "p" +
        Date.now(),

    category:
        category || "Otros",

    name:
        name,

    price:
        price,

    desc:
        desc
});


menuSave(menu);

renderMenuAdmin();
```

}

/* =========================================================
LIBRO MAYOR
========================================================= */

function renderMayor() {

```
const panel =
    document.getElementById(
        "panel-mayor"
    );

if (!panel) return;


const months = {};


state.transactions.forEach(function (t) {

    if (!t.date) return;

    const key =
        cajaMonthKey(t.date);

    if (!months[key]) {

        months[key] = [];
    }

    months[key].push(t);
});


const monthKeys =
    Object.keys(months)
        .sort()
        .reverse();


if (!mayorMonth) {

    mayorMonth =
        monthKeys[0] ||
        cajaTodayStr().slice(0, 7);
}


const monthTx =
    months[mayorMonth] || [];


const ingresos =
    monthTx
        .filter(function (t) {
            return t.type === "ingreso";
        })
        .reduce(function (sum, t) {

            return (
                sum +
                (Number(t.amount) || 0)
            );

        }, 0);


const egresos =
    monthTx
        .filter(function (t) {
            return t.type === "egreso";
        })
        .reduce(function (sum, t) {

            return (
                sum +
                (Number(t.amount) || 0)
            );

        }, 0);


const grouped = {};


monthTx.forEach(function (t) {

    const category =
        t.category ||
        "Sin categoría";

    if (!grouped[category]) {

        grouped[category] = {

            category:
                category,

            income:
                0,

            expense:
                0,

            count:
                0
        };
    }


    const amount =
        Number(t.amount) || 0;


    if (t.type === "ingreso") {

        grouped[category].income +=
            amount;

    } else {

        grouped[category].expense +=
            amount;
    }


    grouped[category].count++;
});


const groups =
    Object.values(grouped);


panel.innerHTML = `

    <div class="caja-section-title">

        <h2>
            Libro mayor
        </h2>


        ${
            monthKeys.length

                ? `

                    <select
                        class="caja-select"
                        style="max-width:180px;"
                        onchange="cambiarMayorMonth(this.value)">

                        ${
                            monthKeys
                                .map(function (m) {

                                    return `

                                        <option
                                            value="${m}"
                                            ${
                                                m === mayorMonth
                                                    ? "selected"
                                                    : ""
                                            }>

                                            ${cajaMonthLabel(m)}

                                        </option>

                                    `;

                                })
                                .join("")
                        }

                    </select>

                  `

                : ""
        }

    </div>


    <div class="stat-grid">

        <div class="stat-card">

            <div class="stat-label">
                INGRESOS
            </div>

            <div class="stat-value up">
                ${money(ingresos)}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                EGRESOS
            </div>

            <div class="stat-value down">
                ${money(egresos)}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                RESULTADO
            </div>

            <div class="stat-value ${
                ingresos - egresos >= 0
                    ? "up"
                    : "down"
            }">

                ${money(
                    ingresos - egresos
                )}

            </div>

        </div>

    </div>


    <div class="caja-card">

        ${
            groups.length

                ? groups.map(function (g) {

                    const neto =
                        g.income -
                        g.expense;


                    return `

                        <div class="ledger-group">

                            <div class="ledger-group-title">

                                <span>
                                    ${escapeHtml(
                                        g.category
                                    )}
                                </span>

                                <span>
                                    ${g.count}
                                </span>

                            </div>


                            ${
                                g.income > 0

                                    ? `
                                        <div class="ledger-line">

                                            <span>
                                                Ingresos
                                            </span>

                                            <span>
                                                ${money(g.income)}
                                            </span>

                                        </div>
                                      `

                                    : ""
                            }


                            ${
                                g.expense > 0

                                    ? `
                                        <div class="ledger-line">

                                            <span>
                                                Egresos
                                            </span>

                                            <span>
                                                ${money(g.expense)}
                                            </span>

                                        </div>
                                      `

                                    : ""
                            }


                            <div class="ledger-line">

                                <span>
                                    Neto
                                </span>

                                <span>
                                    ${money(neto)}
                                </span>

                            </div>

                        </div>

                    `;

                }).join("")

                : `
                    <div class="empty-note">
                        No hay movimientos en este período.
                    </div>
                `
        }

    </div>

`;
```

}

function cambiarMayorMonth(value) {

```
mayorMonth =
    value;

renderMayor();
```

}

/* =========================================================
PUNTO DE EQUILIBRIO
========================================================= */

function renderEquilibrio() {

```
const panel =
    document.getElementById(
        "panel-equilibrio"
    );

if (!panel) return;


const config =
    state.config || {};


const fixedCosts =
    Array.isArray(
        config.fixedCosts
    )
        ? config.fixedCosts
        : [];


const fixedTotal =
    fixedCosts.reduce(
        function (sum, item) {

            return (
                sum +
                (Number(item.amount) || 0)
            );

        },
        0
    );


const variablePct =
    Number(
        config.variablePct
    ) || 0;


const avgTicket =
    Number(
        config.avgTicket
    ) || 0;


let breakEven =
    0;


if (
    avgTicket > 0 &&
    variablePct < 100
) {

    const contribution =
        avgTicket *
        (
            1 -
            variablePct / 100
        );


    if (contribution > 0) {

        breakEven =
            Math.ceil(
                fixedTotal /
                contribution
            );
    }
}


const today =
    cajaTodayStr();


const todaySales =
    state.transactions.filter(
        function (t) {

            return (
                t.date === today &&
                t.type === "ingreso"
            );

        }
    );


const todayRevenue =
    todaySales.reduce(
        function (sum, t) {

            return (
                sum +
                (Number(t.amount) || 0)
            );

        },
        0
    );


const currentTicket =
    todaySales.length
        ? todayRevenue /
          todaySales.length
        : 0;


panel.innerHTML = `

    <div class="caja-section-title">

        <h2>
            Punto de equilibrio
        </h2>

    </div>


    <div class="stat-grid">

        <div class="stat-card">

            <div class="stat-label">
                COSTOS FIJOS
            </div>

            <div class="stat-value">
                ${money(fixedTotal)}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                COSTO VARIABLE
            </div>

            <div class="stat-value">
                ${variablePct}%
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                TICKET PROMEDIO
            </div>

            <div class="stat-value">
                ${money(avgTicket)}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                TICKETS PARA EQUILIBRIO
            </div>

            <div class="stat-value ${
                breakEven
                    ? "up"
                    : ""
            }">

                ${
                    breakEven
                        ? breakEven
                        : "-"
                }

            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                VENTAS HOY
            </div>

            <div class="stat-value">
                ${todaySales.length}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                TICKET REAL HOY
            </div>

            <div class="stat-value">
                ${money(currentTicket)}
            </div>

        </div>

    </div>


    <div class="caja-card">

        <div class="caja-section-title">

            <h2>
                Costos fijos
            </h2>

        </div>


        ${
            fixedCosts.length

                ? fixedCosts.map(
                    function (item) {

                        return `

                            <div class="mov-row">

                                <div
                                    class="mov-icon out">
                                    −
                                </div>


                                <div style="flex:1;">

                                    <div class="mov-cat">

                                        ${escapeHtml(
                                            item.name ||
                                            "Costo"
                                        )}

                                    </div>

                                </div>


                                <div class="mov-amount out">

                                    ${money(
                                        item.amount
                                    )}

                                </div>

                            </div>

                        `;

                    }
                ).join("")

                : `
                    <div class="empty-note">
                        No hay costos fijos cargados.
                    </div>
                `
        }

    </div>

`;
```

}

/* =========================================================
REPORTES
========================================================= */

function renderReportes() {

```
const panel =
    document.getElementById(
        "panel-reportes"
    );

if (!panel) return;


const today =
    cajaTodayStr();


const month =
    cajaMonthKey(today);


const monthTx =
    state.transactions.filter(
        function (t) {

            return (
                t.date &&
                cajaMonthKey(t.date) ===
                month
            );

        }
    );


const ingresos =
    monthTx
        .filter(function (t) {
            return t.type === "ingreso";
        })
        .reduce(function (sum, t) {

            return (
                sum +
                (Number(t.amount) || 0)
            );

        }, 0);


const egresos =
    monthTx
        .filter(function (t) {
            return t.type === "egreso";
        })
        .reduce(function (sum, t) {

            return (
                sum +
                (Number(t.amount) || 0)
            );

        }, 0);


const ventas =
    monthTx.filter(function (t) {

        return t.type === "ingreso";

    });


const ticketPromedio =
    ventas.length
        ? ingresos / ventas.length
        : 0;


const categories = {};


monthTx.forEach(function (t) {

    const category =
        t.category ||
        "Sin categoría";


    if (!categories[category]) {

        categories[category] = {

            ingreso:
                0,

            egreso:
                0
        };
    }


    const amount =
        Number(t.amount) || 0;


    if (t.type === "ingreso") {

        categories[category].ingreso +=
            amount;

    } else {

        categories[category].egreso +=
            amount;
    }

});


panel.innerHTML = `

    <div class="caja-section-title">

        <h2>
            Reportes
        </h2>

        <div class="caja-row">

            <button
                class="caja-btn caja-btn-primary"
                onclick="imprimirReporteMensual()">

                <i class="fa-solid fa-print"></i>
                Imprimir mes

            </button>


            <button
                class="caja-btn caja-btn-ghost"
                onclick="imprimirCierreDiario()">

                <i class="fa-solid fa-print"></i>
                Cierre de hoy

            </button>

        </div>

    </div>


    <div class="stat-grid">

        <div class="stat-card">

            <div class="stat-label">
                INGRESOS
            </div>

            <div class="stat-value up">
                ${money(ingresos)}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                EGRESOS
            </div>

            <div class="stat-value down">
                ${money(egresos)}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                RESULTADO
            </div>

            <div class="stat-value ${
                ingresos - egresos >= 0
                    ? "up"
                    : "down"
            }">

                ${money(
                    ingresos - egresos
                )}

            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                TICKETS
            </div>

            <div class="stat-value">
                ${ventas.length}
            </div>

        </div>


        <div class="stat-card">

            <div class="stat-label">
                TICKET PROMEDIO
            </div>

            <div class="stat-value">
                ${money(ticketPromedio)}
            </div>

        </div>

    </div>


    <div class="caja-card">

        <div class="caja-section-title">

            <h2>
                Resumen por categoría
            </h2>

        </div>


        ${
            Object.keys(categories).length

                ? Object.keys(categories)
                    .map(function (cat) {

                        const item =
                            categories[cat];

                        return `

                            <div class="report-cat-row">

                                <span>
                                    ${escapeHtml(cat)}
                                </span>

                                <span>

                                    ${
                                        item.ingreso
                                            ? "+" +
                                              money(
                                                  item.ingreso
                                              )
                                            : ""
                                    }

                                    ${
                                        item.egreso
                                            ? " / -" +
                                              money(
                                                  item.egreso
                                              )
                                            : ""
                                    }

                                </span>

                            </div>

                        `;

                    })
                    .join("")

                : `
                    <div class="empty-note">
                        No hay movimientos este mes.
                    </div>
                `
        }

    </div>

`;
```

}

/* =========================================================
IMPRESIÓN
========================================================= */

function abrirVentanaImpresion(htmlBody) {

```
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

    "<!DOCTYPE html>" +

    "<html>" +

    "<head>" +

    '<meta charset="UTF-8">' +

    "<title>MYCFOODS · Caja</title>" +

    "<style>" +

    "@page{" +
        "size:80mm auto;" +
        "margin:2mm;" +
    "}" +

    "html,body{" +
        "width:76mm;" +
        "margin:0;" +
        "padding:0;" +
        "background:#fff;" +
    "}" +

    "body{" +
        'font-family:"Courier New",monospace;' +
        "font-size:11.5px;" +
        "font-weight:bold;" +
        "line-height:1.5;" +
        "color:#000;" +
    "}" +

    ".row{" +
        "display:flex;" +
        "justify-content:space-between;" +
        "gap:8px;" +
        "margin:2px 0;" +
    "}" +

    ".divider{" +
        "border-top:1px dashed #000;" +
        "margin:6px 0;" +
    "}" +

    ".center{" +
        "text-align:center;" +
    "}" +

    "</style>" +

    "</head>" +

    "<body>" +

    htmlBody +

    "</body>" +

    "</html>"
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
```

}

/* =========================================================
CIERRE DIARIO
========================================================= */

function imprimirCierreDiario() {

```
refreshState();


const today =
    cajaTodayStr();


const tx =
    state.transactions.filter(
        function (t) {

            return t.date === today;

        }
    );


let ingresos = 0;
let egresos = 0;


tx.forEach(function (t) {

    const amount =
        Number(t.amount) || 0;


    if (t.type === "ingreso") {

        ingresos += amount;

    } else {

        egresos += amount;
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


    ${
        tx.length

            ? tx.map(function (t) {

                return `

                    <div class="row">

                        <span>
                            ${escapeHtml(
                                t.category ||
                                "Movimiento"
                            )}
                        </span>

                        <span>
                            ${
                                t.type === "ingreso"
                                    ? "+"
                                    : "-"
                            }

                            ${money(
                                t.amount
                            )}

                        </span>

                    </div>

                `;

            }).join("")

            : `
                <div>
                    Sin movimientos.
                </div>
              `
    }


    <div class="divider"></div>


    <div class="row">
        <span>INGRESOS</span>
        <span>${money(ingresos)}</span>
    </div>


    <div class="row">
        <span>EGRESOS</span>
        <span>${money(egresos)}</span>
    </div>


    <div class="row">
        <span>RESULTADO</span>
        <span>
            ${money(ingresos - egresos)}
        </span>
    </div>


    <div class="divider"></div>


    <div class="center">
        Fin del cierre
    </div>

`;


abrirVentanaImpresion(html);
```

}

/* =========================================================
REPORTE MENSUAL
========================================================= */

function imprimirReporteMensual() {

```
refreshState();


const month =
    cajaMonthKey(
        cajaTodayStr()
    );


const tx =
    state.transactions.filter(
        function (t) {

            return (
                t.date &&
                cajaMonthKey(t.date) ===
                month
            );

        }
    );


let ingresos = 0;
let egresos = 0;


tx.forEach(function (t) {

    const amount =
        Number(t.amount) || 0;


    if (t.type === "ingreso") {

        ingresos += amount;

    } else {

        egresos += amount;
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


    ${
        tx.length

            ? tx.map(function (t) {

                return `

                    <div class="row">

                        <span>
                            ${escapeHtml(
                                t.date || ""
                            )}
                        </span>

                        <span>
                            ${
                                t.type === "ingreso"
                                    ? "+"
                                    : "-"
                            }

                            ${money(
                                t.amount
                            )}

                        </span>

                    </div>


                    <div>
                        ${escapeHtml(
                            t.category ||
                            "Movimiento"
                        )}
                    </div>

                `;

            }).join("")

            : `
                <div>
                    Sin movimientos.
                </div>
              `
    }


    <div class="divider"></div>


    <div class="row">
        <span>INGRESOS</span>
        <span>${money(ingresos)}</span>
    </div>


    <div class="row">
        <span>EGRESOS</span>
        <span>${money(egresos)}</span>
    </div>


    <div class="row">
        <span>RESULTADO</span>
        <span>
            ${money(ingresos - egresos)}
        </span>
    </div>

`;


abrirVentanaImpresion(html);
```

}

/* =========================================================
INICIO
========================================================= */

document.addEventListener(
"DOMContentLoaded",
function () {

```
    document
        .querySelectorAll(".caja-tab-btn")
        .forEach(function (btn) {

            btn.addEventListener(
                "click",
                function () {

                    setTab(
                        btn.dataset.tab
                    );

                }
            );

        });


    setTab("resumen");

}
```

);
