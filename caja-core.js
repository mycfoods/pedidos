/* =========================================================
   MYCFOODS · CAJA CORE
   Funciones compartidas de almacenamiento y cálculo.
   Cargar ANTES de caja.js
========================================================= */

const CAJA_STORAGE_KEY = "mycfoods_caja_v1";

const CAJA_METHODS = [
    "Efectivo",
    "Transferencia",
    "Tarjeta de Débito / Crédito",
    "QR / Mercado Pago",
    "Otro"
];

const CAJA_INCOME_CATS = [
    "Ventas delivery",
    "Ventas take away",
    "Ventas salón",
    "Eventos",
    "Otros ingresos"
];

const CAJA_EXPENSE_CATS = [
    "Mercadería e insumos",
    "Sueldos y cargas sociales",
    "Alquiler",
    "Servicios (luz/agua/gas)",
    "Mantenimiento",
    "Marketing",
    "Impuestos",
    "Otros gastos"
];

/* =========================================================
   MAPEO PEDIDOS → CAJA
========================================================= */

const CAJA_ENTREGA_TO_CATEGORY = {
    "Delivery (Tigre Centro)": "Ventas delivery",
    "Retiro por local (Luis Pereyra 440)": "Ventas take away",
    "Salon": "Ventas salón",
    "Salón": "Ventas salón"
};

/* =========================================================
   UTILIDADES
========================================================= */

function cajaEscapeHtml(s) {

    return String(
        s == null ? "" : s
    ).replace(
        /[&<>"']/g,
        function (c) {

            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[c];

        }
    );
}

/* =========================================================
   MENÚ
========================================================= */

const MENU_STORAGE_KEY = "mycfoods_menu_v1";

function menuDefaultData() {

    return {
        products: [

            {
                id: "p1",
                category: "Wraps",
                name: "Wrap Ceasar",
                price: 14500,
                desc: "Pollo, mix de lechuga, aderezo ceasar y parmesano."
            },

            {
                id: "p2",
                category: "Menú del Día",
                name: "Menú del Día",
                price: 13500,
                desc: "Consultar plato del día."
            },

            {
                id: "p3",
                category: "Minutas",
                name: "Pechuga Grillé",
                price: 10000,
                desc: "Minuta sin guarnición."
            },

            {
                id: "p4",
                category: "Minutas",
                name: "Milanesa de Carne",
                price: 12000,
                desc: "Minuta sin guarnición."
            },

            {
                id: "p5",
                category: "Minutas",
                name: "Suprema de Pollo",
                price: 9500,
                desc: "Minuta sin guarnición."
            },

            {
                id: "p6",
                category: "Minutas",
                name: "Omelette de Queso",
                price: 8000,
                desc: "Minuta sin guarnición."
            },

            {
                id: "p7",
                category: "Minutas",
                name: "Tortilla de Papa",
                price: 9500,
                desc: "Minuta sin guarnición."
            },

            {
                id: "p8",
                category: "Adicionales",
                name: "Adicional Tomate",
                price: 2000,
                desc: "Porción individual (75g)."
            },

            {
                id: "p9",
                category: "Adicionales",
                name: "Adicional Zanahoria",
                price: 2000,
                desc: "Porción individual (75g)."
            },

            {
                id: "p10",
                category: "Adicionales",
                name: "Adicional Lechuga",
                price: 2000,
                desc: "Porción individual (75g)."
            },

            {
                id: "p11",
                category: "Adicionales",
                name: "Adicional Cebolla",
                price: 2000,
                desc: "Porción individual (75g)."
            },

            {
                id: "p12",
                category: "Adicionales",
                name: "Adicional Huevos Duros",
                price: 2000,
                desc: "Porción individual (75g)."
            },

            {
                id: "p13",
                category: "Adicionales",
                name: "Puré de Papa",
                price: 3500,
                desc: "Porción individual (75g)."
            },

            {
                id: "p14",
                category: "Adicionales",
                name: "Huevos Revueltos (x4)",
                price: 3000,
                desc: "Solos (x4 unidades)."
            },

            {
                id: "p15",
                category: "Adicionales",
                name: "Papas Rústicas al Horno",
                price: 3500,
                desc: "Al horno."
            },

            {
                id: "p16",
                category: "Adicionales",
                name: "Arroz Blanco",
                price: 3500,
                desc: "Porción individual (75g)."
            },

            {
                id: "p17",
                category: "Adicionales",
                name: "Puré de Kabutia",
                price: 3500,
                desc: "Porción individual (75g)."
            },

            {
                id: "p18",
                category: "Ensaladas",
                name: "Ensalada Completa",
                price: 12000,
                desc: "Mix verdes, tomate, choclo, zanahoria y huevo duro."
            },

            {
                id: "p19",
                category: "Ensaladas",
                name: "Ensalada César",
                price: 13500,
                desc: "Mix verdes, pollo, parmesano y crutones."
            },

            {
                id: "p20",
                category: "Empanadas",
                name: "Empanada Carne a Cuchillo",
                price: 3500,
                desc: "Individual."
            },

            {
                id: "p21",
                category: "Empanadas",
                name: "Empanada Jamón y Queso",
                price: 3500,
                desc: "Individual."
            },

            {
                id: "p22",
                category: "Empanadas",
                name: "Empanada Pollo",
                price: 3500,
                desc: "Individual."
            },

            {
                id: "p23",
                category: "Empanadas",
                name: "Empanada Espinaca y Salsa Blanca",
                price: 3500,
                desc: "Individual."
            },

            {
                id: "p24",
                category: "Tartas",
                name: "Tarta Jamón y Queso",
                price: 12000,
                desc: "Tarta individual (aprox 600g)."
            },

            {
                id: "p25",
                category: "Tartas",
                name: "Tarta Kabutia",
                price: 12000,
                desc: "Tarta individual (aprox 600g)."
            },

            {
                id: "p26",
                category: "Tartas",
                name: "Tarta Acelga",
                price: 12000,
                desc: "Tarta individual (aprox 600g)."
            },

            {
                id: "p27",
                category: "Tartas",
                name: "Tarta Vegetales Mixta",
                price: 12000,
                desc: "Tarta individual (aprox 600g)."
            },

            {
                id: "p28",
                category: "Sandwichs Ciabatta",
                name: "Sándwich Completo",
                price: 17000,
                desc: "Carne o pollo, lechuga, tomate, jamón y queso en pan ciabatta."
            },

            {
                id: "p29",
                category: "Sandwichs Ciabatta",
                name: "Sándwich Mila Carne/Pollo c/ J&Q",
                price: 15000,
                desc: "Con jamón y queso en pan ciabatta."
            },

            {
                id: "p30",
                category: "Sandwichs Ciabatta",
                name: "Sándwich Solo Carne o Pollo",
                price: 13500,
                desc: "En pan ciabatta."
            },

            {
                id: "p31",
                category: "Sandwichs Ciabatta",
                name: "Sándwich De Pollo Especial",
                price: 15000,
                desc: "Pollo grillado, pesto de tomate seco y muzzarella en pan ciabatta."
            },

            {
                id: "p32",
                category: "Sandwichs Ciabatta",
                name: "Sándwich Jamón y Queso",
                price: 12000,
                desc: "En pan ciabatta."
            },

            {
                id: "p33",
                category: "Sandwichs Ciabatta",
                name: "Sándwich Jamón, Queso y Tomate",
                price: 12000,
                desc: "En pan ciabatta."
            },

            {
                id: "p34",
                category: "Sandwichs Ciabatta",
                name: "Sándwich Queso y Tomate",
                price: 12000,
                desc: "En pan ciabatta."
            }

        ]
    };
}

function menuLoad() {

    try {

        const raw =
            localStorage.getItem(
                MENU_STORAGE_KEY
            );

        if (!raw) {
            return menuDefaultData();
        }

        const parsed =
            JSON.parse(raw);

        if (
            !parsed ||
            !Array.isArray(parsed.products) ||
            parsed.products.length === 0
        ) {
            return menuDefaultData();
        }

        return parsed;

    } catch (e) {

        console.error(
            "Error leyendo menú:",
            e
        );

        return menuDefaultData();
    }
}

function menuSave(data) {

    try {

        localStorage.setItem(
            MENU_STORAGE_KEY,
            JSON.stringify(data)
        );

        return true;

    } catch (e) {

        console.error(
            "Error guardando menú:",
            e
        );

        return false;
    }
}

/* =========================================================
   CONFIGURACIÓN DE CAJA
========================================================= */

function cajaDefaults() {

    return {

        transactions: [],

        openings: {},

        config: {

            fixedCosts: [],

            variablePct: "",

            avgTicket: "",

            unit: "pedidos",

            autoTicket: true
        },

        businessName: "MYCFOODS"
    };
}

/* =========================================================
   CARGAR CAJA
========================================================= */

function cajaLoad() {

    try {

        const raw =
            localStorage.getItem(
                CAJA_STORAGE_KEY
            );

        if (!raw) {
            return cajaDefaults();
        }

        const parsed =
            JSON.parse(raw);

        const defaults =
            cajaDefaults();

        const merged =
            Object.assign(
                defaults,
                parsed
            );

        merged.config =
            Object.assign(
                defaults.config,
                parsed.config || {}
            );

        if (
            !Array.isArray(
                merged.config.fixedCosts
            )
        ) {
            merged.config.fixedCosts = [];
        }

        if (
            !Array.isArray(
                merged.transactions
            )
        ) {
            merged.transactions = [];
        }

        if (!merged.openings) {
            merged.openings = {};
        }

        return merged;

    } catch (e) {

        console.error(
            "Error leyendo caja:",
            e
        );

        return cajaDefaults();
    }
}

/* =========================================================
   GUARDAR CAJA
========================================================= */

function cajaSave(data) {

    try {

        localStorage.setItem(
            CAJA_STORAGE_KEY,
            JSON.stringify(data)
        );

        return true;

    } catch (e) {

        console.error(
            "Error guardando caja:",
            e
        );

        return false;
    }
}

/* =========================================================
   ID ÚNICO
========================================================= */

function cajaUid() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}

/* =========================================================
   FECHA LOCAL
========================================================= */

function cajaTodayStr() {

    const d = new Date();

    const tz =
        d.getTimezoneOffset() * 60000;

    return new Date(
        d.getTime() - tz
    )
        .toISOString()
        .slice(0, 10);
}

/* =========================================================
   MES
========================================================= */

function cajaMonthKey(dateStr) {

    return String(dateStr).slice(0, 7);
}

function cajaMonthLabel(key) {

    const parts =
        key.split("-");

    const names = [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic"
    ];

    return (
        names[
            parseInt(
                parts[1],
                10
            ) - 1
        ] +
        " '" +
        parts[0].slice(2)
    );
}

/* =========================================================
   FORMATO DINERO
========================================================= */

function cajaFmtMoney(n) {

    const v =
        Number(n) || 0;

    const sign =
        v < 0 ? "-" : "";

    return (
        sign +
        "$" +
        Math.abs(v).toLocaleString(
            "es-AR",
            {
                maximumFractionDigits: 0
            }
        )
    );
}

/* =========================================================
   FORMATO FECHA
========================================================= */

function cajaFmtDateLabel(dateStr) {

    const p =
        String(dateStr).split("-");

    return (
        p[2] +
        "/" +
        p[1]
    );
}

/* =========================================================
   CALCULAR SALDOS
========================================================= */

function cajaComputeBalances(
    transactions,
    openings
) {

    const dates =
        Object.keys(
            openings || {}
        ).sort();

    const today =
        cajaTodayStr();

    let baseDate = null;

    let baseP = 0;

    let baseC = 0;

    dates.forEach(
        function (d) {

            if (d <= today) {

                baseDate = d;

                baseP =
                    (
                        openings[d] &&
                        openings[d].principal
                    ) || 0;

                baseC =
                    (
                        openings[d] &&
                        openings[d].chica
                    ) || 0;
            }
        }
    );

    let principal =
        Number(baseP) || 0;

    let chica =
        Number(baseC) || 0;

    transactions.forEach(
        function (m) {

            if (
                baseDate &&
                m.date < baseDate
            ) {
                return;
            }

            const amount =
                Number(m.amount) || 0;

            const v =
                m.type === "ingreso"
                    ? amount
                    : -amount;

            if (
                m.ledger === "principal"
            ) {
                principal += v;
            } else {
                chica += v;
            }
        }
    );

    return {

        principal:
            principal,

        chica:
            chica,

        baseDate:
            baseDate
    };
}

/* =========================================================
   AGREGAR MOVIMIENTO
========================================================= */

function cajaAddTransaction(tx) {

    const data =
        cajaLoad();

    data.transactions.push(

        Object.assign(

            {
                id: cajaUid()
            },

            tx
        )
    );

    cajaSave(data);

    return data;
}

/* =========================================================
   REGISTRAR VENTA DESDE PEDIDO
========================================================= */

function cajaRegistrarVentaDesdePedido(
    opts
) {

    opts =
        opts || {};

    const categoria =
        CAJA_ENTREGA_TO_CATEGORY[
            opts.tipoEntrega
        ] ||
        "Otros ingresos";

    cajaAddTransaction({

        type: "ingreso",

        ledger:
            opts.ledger ||
            "principal",

        date:
            cajaTodayStr(),

        category:
            categoria,

        method:
            opts.pago ||
            "",

        amount:
            Number(opts.total) ||
            0,

        note:
            "Pedido: " +
            (opts.nombre || "")
    });
}
