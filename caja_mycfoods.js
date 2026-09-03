/* =========================================================
   MYCFOODS — MOSTRADOR + CAJA
   Complemento para el index.html existente.
   No reemplaza el carrito ni el menú público.
========================================================= */
(function () {
  'use strict';

  const STORAGE = 'mycfoods_caja_v1';
  const METHODS = ['Efectivo', 'Mercado Pago', 'Transferencia', 'Tarjeta'];
  const LEDGERS = ['principal', 'chica'];
  let state = loadState();
  let posCart = [];
  let posMethod = 'Efectivo';
  let posDelivery = 'Salón';
  let currentCategory = '';
  let printBusy = false;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function today() {
    return new Date().toLocaleDateString('en-CA');
  }

  function money(n) {
    return '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, s => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[s]));
  }

  function loadState() {
    try {
      const x = JSON.parse(localStorage.getItem(STORAGE) || '{}');

      return {
        transactions: Array.isArray(x.transactions) ? x.transactions : [],
        openings: x.openings || {},
        config: Object.assign({
          fixedCosts: '',
          variablePct: '',
          avgTicket: ''
        }, x.config || {}),
        businessName: x.businessName || 'MYCFOODS'
      };

    } catch (_) {

      return {
        transactions: [],
        openings: {},
        config: {
          fixedCosts:'',
          variablePct:'',
          avgTicket:''
        },
        businessName:'MYCFOODS'
      };

    }
  }

  function saveState() {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  }

  function addTx(tx) {
    state.transactions.push(tx);
    saveState();
    renderCaja();
  }

  function fmtDate(d) {
    if (!d) return '';

    const p = d.split('-');

    return p.length === 3
      ? `${p[2]}/${p[1]}/${p[0]}`
      : d;
  }

  function totalTx(date, type, method) {

    return state.transactions
      .filter(t =>
        (!date || t.date === date) &&
        (!type || t.type === type) &&
        (!method || t.method === method)
      )
      .reduce((a, t) => a + Number(t.amount || 0), 0);

  }

  function getProducts() {

    const out = [];

    document
      .querySelectorAll('.menu-accordion-grid .accordion-item')
      .forEach(card => {

        const nameEl = card.querySelector('.prod-name');
        const priceEl = card.querySelector('.price');

        if (!nameEl || !priceEl) return;

        const raw = (priceEl.textContent || '')
          .replace(/[^0-9]/g, '');

        const price = Number(raw);

        if (!price) return;

        let name = (nameEl.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();

        name = name.replace(/^\S+\s+/, '');

        if (!name) {
          name = (
            card.querySelector('.accordion-header')?.textContent || ''
          )
            .replace(/\s+/g, ' ')
            .trim();
        }

        const cls =
          [...card.classList]
            .find(c => c.indexOf('cat-') === 0) ||
          'cat-otros';

        const category = cls
          .replace('cat-', '')
          .replace(/-/g, ' ');

        out.push({
          id: name.toLowerCase(),
          name,
          price,
          category
        });

      });

    const seen = new Set();

    return out.filter(p => {

      if (seen.has(p.name)) return false;

      seen.add(p.name);

      return true;

    });

  }

  function categories() {
    return [
      ...new Set(
        getProducts().map(p => p.category)
      )
    ];
  }

  function openPOS() {

    const el = document.getElementById('mycfoods-pos');

    if (!el) return;

    el.classList.add('open');

    renderPOS();

  }

  function closePOS() {

    document
      .getElementById('mycfoods-pos')
      ?.classList.remove('open');

  }

  function addPOS(product) {

    const found = posCart.find(
      x => x.name === product.name
    );

    if (found) {
      found.qty++;
    } else {
      posCart.push({
        ...product,
        qty:1
      });
    }

    renderPOS();

  }

  function changePOS(i, d) {

    if (!posCart[i]) return;

    posCart[i].qty += d;

    if (posCart[i].qty <= 0) {
      posCart.splice(i, 1);
    }

    renderPOS();

  }

  function posTotal() {

    return posCart.reduce(
      (a, x) => a + x.price * x.qty,
      0
    );

  }

  function renderPOS() {

    const root =
      document.getElementById('mycfoods-pos');

    if (!root) return;

    const products = getProducts();
    const cats = categories();

    if (
      !currentCategory ||
      !cats.includes(currentCategory)
    ) {
      currentCategory = cats[0] || '';
    }

    const shown =
      products.filter(
        p => p.category === currentCategory
      );

    root.querySelector('.mc-pos-cats').innerHTML =
      cats.map(c => `
        <button
          class="mc-chip ${c === currentCategory ? 'active' : ''}"
          data-cat="${esc(c)}"
        >
          ${esc(c)}
        </button>
      `).join('');

    root.querySelector('.mc-pos-products').innerHTML =
      shown.map(p => `
        <button
          class="mc-product"
          data-pidx="${products.indexOf(p)}"
        >
          <span>${esc(p.name)}</span>
          <strong>${money(p.price)}</strong>
        </button>
      `).join('') ||
      '<div class="mc-empty">No hay productos en esta categoría.</div>';

    const total = posTotal();

    root.querySelector('.mc-cart').innerHTML =
      posCart.length
        ? posCart.map((x, i) => `
          <div class="mc-line">

            <div>
              <b>${esc(x.name)}</b>
              <small>${money(x.price)} c/u</small>
            </div>

            <div class="mc-line-right">

              <button
                data-q="${i}"
                data-d="-1"
              >
                −
              </button>

              <b>${x.qty}</b>

              <button
                data-q="${i}"
                data-d="1"
              >
                +
              </button>

              <strong>
                ${money(x.price * x.qty)}
              </strong>

            </div>

          </div>
        `).join('')
        : '<div class="mc-empty">Agregá productos para comenzar.</div>';

    root.querySelector('.mc-total').textContent =
      money(total);

    root.querySelector('.mc-pay-buttons').innerHTML =
      METHODS.map(m => `
        <button
          class="mc-pay ${m === posMethod ? 'active' : ''}"
          data-method="${m}"
        >
          ${m}
        </button>
      `).join('');

    const rec =
      root.querySelector('.mc-received');

    const change =
      root.querySelector('.mc-change');

    const received =
      Number(rec?.value || 0);

    const vuelto =
      Math.max(0, received - total);

    change.textContent =
      money(vuelto);

    root.querySelector('.mc-confirm').disabled =
      !(
        total > 0 &&
        (
          posMethod !== 'Efectivo' ||
          received >= total
        )
      );

    root.querySelector('.mc-pos-count').textContent =
      posCart.reduce(
        (a, x) => a + x.qty,
        0
      );

    root.querySelector('.mc-delivery-buttons').innerHTML =
      ['Salón', 'Take Away', 'Delivery']
        .map(m => `
          <button
            class="mc-pay ${m === posDelivery ? 'active' : ''}"
            data-delivery="${m}"
          >
            ${m}
          </button>
        `)
        .join('');

    renderCaja();

  }

  function renderCaja() {

    const box =
      document.getElementById('mycfoods-caja');

    if (!box) return;

    const d = today();
    const month = d.slice(0, 7);
    const tx = state.transactions;

    const dayIn =
      totalTx(d, 'ingreso');

    const dayOut =
      totalTx(d, 'egreso');

    const monthIn =
      tx
        .filter(
          t =>
            t.date.slice(0, 7) === month &&
            t.type === 'ingreso'
        )
        .reduce(
          (a, t) => a + Number(t.amount),
          0
        );

    const monthOut =
      tx
        .filter(
          t =>
            t.date.slice(0, 7) === month &&
            t.type === 'egreso'
        )
        .reduce(
          (a, t) => a + Number(t.amount),
          0
        );

    const cashIn =
      totalTx(d, 'ingreso', 'Efectivo');

    const cashOut =
      totalTx(d, 'egreso', 'Efectivo');

    const opening =
      Number(
        state.openings[d]?.amount || 0
      );

    const expected =
      opening +
      cashIn -
      cashOut;

    box.querySelector(
      '[data-stat="dayIn"]'
    ).textContent =
      money(dayIn);

    box.querySelector(
      '[data-stat="dayOut"]'
    ).textContent =
      money(dayOut);

    box.querySelector(
      '[data-stat="monthIn"]'
    ).textContent =
      money(monthIn);

    box.querySelector(
      '[data-stat="result"]'
    ).textContent =
      money(monthIn - monthOut);

    box.querySelector(
      '[data-stat="cashExpected"]'
    ).textContent =
      money(expected);

    box.querySelector(
      '[data-opening]'
    ).value =
      opening || '';

    const rows =
      tx
        .slice()
        .sort(
          (a, b) =>
            (b.date + b.time)
              .localeCompare(
                a.date + a.time
              )
        )
        .slice(0, 100);

    box.querySelector(
      '.mc-movements'
    ).innerHTML =
      rows.length
        ? rows.map(t => `
          <div class="mc-movement">

            <div>
              <b>
                ${t.type === 'ingreso' ? '+' : '−'}
                ${money(t.amount)}
              </b>

              <span>
                ${esc(t.category || 'Movimiento')}
                ·
                ${esc(t.method || '')}
              </span>
            </div>

            <small>
              ${fmtDate(t.date)}
              ${esc(t.time || '')}
              <br>
              ${esc(t.note || '')}
            </small>

            <button
              data-del-tx="${t.id}"
            >
              ×
            </button>

          </div>
        `).join('')
        : '<div class="mc-empty">Todavía no hay movimientos.</div>';

    const byMethod =
      METHODS.map(m => [
        m,
        totalTx(month, 'ingreso', m)
      ]);

    box.querySelector(
      '.mc-methods'
    ).innerHTML =
      byMethod.map(([m, v]) => `
        <div>
          <span>${m}</span>
          <b>${money(v)}</b>
        </div>
      `).join('');

    const fixed =
      Number(state.config.fixedCosts || 0);

    const variable =
      Number(state.config.variablePct || 0);

    const avg =
      Number(state.config.avgTicket || 0);

    const target =
      variable < 100
        ? fixed / (1 - variable / 100)
        : 0;

    const units =
      avg > 0
        ? Math.ceil(target / avg)
        : 0;

    box.querySelector(
      '[data-be="target"]'
    ).textContent =
      money(target);

    box.querySelector(
      '[data-be="units"]'
    ).textContent =
      units
        ? units + ' tickets/mes'
        : '—';

    box.querySelector(
      '[data-be="fixed"]'
    ).value =
      state.config.fixedCosts || '';

    box.querySelector(
      '[data-be="variable"]'
    ).value =
      state.config.variablePct || '';

    box.querySelector(
      '[data-be="avg"]'
    ).value =
      state.config.avgTicket || '';

  }

  function confirmPOS() {

    const total = posTotal();

    if (!total) return;

    const received =
      Number(
        document.querySelector(
          '.mc-received'
        )?.value || 0
      );

    if (
      posMethod === 'Efectivo' &&
      received < total
    ) {
      alert(
        'El dinero recibido es menor al total.'
      );
      return;
    }

    const now = new Date();

    const tx = {
      id: uid(),
      date: today(),
      time: now.toLocaleTimeString(
        'es-AR',
        {
          hour:'2-digit',
          minute:'2-digit',
          second:'2-digit',
          hour12:false
        }
      ),
      type:'ingreso',
      category:'Venta mostrador',
      method:posMethod,
      ledger:'principal',
      amount:total,
      note:
        `${posDelivery} · ${
          posCart
            .map(
              x =>
                x.qty +
                'x ' +
                x.name
            )
            .join(', ')
        }`,
      items:
        posCart.map(
          x => ({
            name:x.name,
            price:x.price,
            qty:x.qty
          })
        )
    };

    addTx(tx);

    printTicket({
      type:'venta',
      ...tx,
      received,
      posDelivery
    });

    posCart = [];

    const rec =
      document.querySelector(
        '.mc-received'
      );

    if (rec) rec.value = '';

    renderPOS();

  }

  function printTicket(order) {

    if (printBusy) return;

    printBusy = true;

    const items =
      order.items || [];

    const total =
      Number(order.amount || 0);

    const received =
      Number(order.received || 0);

    const change =
      Math.max(
        0,
        received - total
      );

    const rows =
      items.map(
        x => `
          <div class="pitem">
            <span>${x.qty} x</span>
            <b>${esc(x.name)}</b>
            <span>${money(x.price * x.qty)}</span>
          </div>
        `
      ).join('');

    const html = `
      <!doctype html>

      <html>

      <head>

        <meta charset="utf-8">

        <title>MYCFOODS</title>

        <style>

          @page {
            size:80mm auto;
            margin:0
          }

          * {
            box-sizing:border-box
          }

          html,
          body {
            width:80mm;
            margin:0;
            padding:0
          }

          body {
            padding:4mm;
            font-family:"Courier New",monospace;
            font-size:12px;
            line-height:1.35;
            color:#000
          }

          .head {
            text-align:center;
            font-weight:bold;
            font-size:18px
          }

          .line {
            border-top:1px dashed #000;
            margin:7px 0
          }

          .pitem {
            display:grid;
            grid-template-columns:30px 1fr 58px;
            gap:3px;
            margin:5px 0;
            align-items:start
          }

          .pitem span:last-child {
            text-align:right;
            white-space:nowrap
          }

          .total {
            display:flex;
            justify-content:space-between;
            font-size:16px;
            font-weight:bold;
            margin-top:8px
          }

          .center {
            text-align:center
          }

        </style>

      </head>

      <body>

        <div class="head">
          MYCFOODS<br>
          COMANDA
        </div>

        <div class="line"></div>

        <div>
          FECHA: ${fmtDate(order.date)}
        </div>

        <div>
          HORA: ${esc(order.time)}
        </div>

        <div>
          TIPO: ${esc(order.posDelivery || 'Mostrador')}
        </div>

        <div>
          PAGO: ${esc(order.method)}
        </div>

        <div class="line"></div>

        ${rows}

        <div class="line"></div>

        <div class="total">
          <span>TOTAL</span>
          <span>${money(total)}</span>
        </div>

        ${
          order.method === 'Efectivo'
            ? `
              <div>
                RECIBIDO: ${money(received)}
              </div>

              <div>
                VUELTO: ${money(change)}
              </div>
            `
            : ''
        }

        <div class="line"></div>

        <div class="center">
          Gracias
        </div>

      </body>

      </html>
    `;

    const w =
      window.open(
        '',
        '_blank',
        'width=420,height=650'
      );

    if (!w) {

      printBusy = false;

      alert(
        'El navegador bloqueó la ventana de impresión.'
      );

      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();

    setTimeout(() => {

      try {
        w.focus();
        w.print();
      } catch(e) {}

      setTimeout(() => {

        try {
          w.close();
        } catch(e) {}

        printBusy = false;

      }, 900);

    }, 250);

  }

  function injectStyles() {

    const s =
      document.createElement('style');

    s.textContent = `

#mycfoods-pos,
#mycfoods-caja {
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.78);
  z-index:10000;
  padding:18px;
  overflow:auto
}

#mycfoods-pos.open,
#mycfoods-caja.open {
  display:flex;
  justify-content:center;
  align-items:flex-start
}

.mc-panel {
  width:min(1180px,100%);
  margin:auto;
  background:#101010;
  border:1px solid #2b2b2b;
  border-radius:12px;
  box-shadow:0 20px 80px #000;
  padding:18px;
  color:#fff
}

.mc-top {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:14px
}

.mc-title {
  font-size:20px;
  font-weight:800
}

.mc-sub {
  font-size:12px;
  color:#999
}

.mc-close {
  background:transparent;
  border:1px solid #333;
  color:#fff;
  border-radius:8px;
  padding:8px 12px;
  cursor:pointer
}

.mc-layout {
  display:grid;
  grid-template-columns:1fr 350px;
  gap:16px
}

.mc-cats,
.mc-pay-buttons,
.mc-delivery-buttons {
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  margin-bottom:12px
}

.mc-chip,
.mc-pay {
  background:#171717;
  border:1px solid #303030;
  color:#aaa;
  border-radius:20px;
  padding:8px 12px;
  cursor:pointer
}

.mc-chip.active,
.mc-pay.active {
  background:var(--accent,#f1a80a);
  color:#0b0b0b;
  border-color:var(--accent,#f1a80a);
  font-weight:800
}

.mc-products {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(190px,1fr));
  gap:8px
}

.mc-product {
  display:flex;
  justify-content:space-between;
  gap:8px;
  text-align:left;
  background:#151515;
  border:1px solid #292929;
  color:#fff;
  border-radius:9px;
  padding:13px;
  cursor:pointer;
  min-height:58px
}

.mc-product:hover {
  border-color:var(--accent,#f1a80a);
  transform:translateY(-1px)
}

.mc-product strong,
.mc-total {
  color:var(--accent,#f1a80a)
}

.mc-side {
  background:#0b0b0b;
  border:1px solid #292929;
  border-radius:10px;
  padding:13px
}

.mc-cart {
  max-height:330px;
  overflow:auto
}

.mc-line {
  display:flex;
  justify-content:space-between;
  gap:8px;
  padding:9px 0;
  border-bottom:1px solid #222
}

.mc-line small {
  display:block;
  color:#888
}

.mc-line-right {
  display:flex;
  align-items:center;
  gap:5px
}

.mc-line-right button {
  width:25px;
  height:25px;
  border-radius:5px;
  background:#191919;
  border:1px solid #333;
  color:#fff;
  cursor:pointer
}

.mc-line-right strong {
  margin-left:5px
}

.mc-total-row {
  display:flex;
  justify-content:space-between;
  font-size:23px;
  font-weight:800;
  padding:14px 0
}

.mc-received {
  width:100%;
  padding:11px;
  background:#111;
  border:1px solid #333;
  border-radius:7px;
  color:#fff;
  font-size:18px;
  margin:7px 0
}

.mc-change-row {
  display:flex;
  justify-content:space-between;
  padding:8px 0;
  color:#aaa
}

.mc-change {
  color:#fff;
  font-weight:800
}

.mc-confirm {
  width:100%;
  padding:14px;
  border:0;
  border-radius:8px;
  background:var(--accent,#f1a80a);
  color:#0b0b0b;
  font-size:16px;
  font-weight:900;
  cursor:pointer
}

.mc-confirm:disabled {
  opacity:.35;
  cursor:not-allowed
}

.mc-actions {
  display:flex;
  gap:8px;
  margin-top:10px
}

.mc-secondary {
  flex:1;
  padding:10px;
  background:transparent;
  border:1px solid #333;
  color:#bbb;
  border-radius:7px;
  cursor:pointer
}

.mc-empty {
  text-align:center;
  color:#777;
  padding:25px
}

.mc-count {
  font-size:12px;
  color:#aaa
}

.mc-stats {
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:9px;
  margin-bottom:14px
}

.mc-stat {
  background:#151515;
  border:1px solid #292929;
  border-radius:9px;
  padding:12px
}

.mc-stat span {
  display:block;
  color:#888;
  font-size:11px
}

.mc-stat b {
  font-size:20px;
  margin-top:5px;
  display:block
}

.mc-tabs {
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  margin-bottom:14px
}

.mc-tab {
  padding:8px 12px;
  background:#171717;
  border:1px solid #333;
  color:#aaa;
  border-radius:7px;
  cursor:pointer
}

.mc-tab.active {
  background:#f1a80a;
  color:#0b0b0b
}

.mc-section {
  background:#151515;
  border:1px solid #292929;
  border-radius:9px;
  padding:14px;
  margin-bottom:12px
}

.mc-section h3 {
  margin:0 0 10px;
  font-size:15px
}

.mc-movement {
  display:grid;
  grid-template-columns:1fr auto 28px;
  gap:8px;
  align-items:center;
  padding:9px 0;
  border-bottom:1px solid #222
}

.mc-movement span,
.mc-movement small {
  display:block;
  color:#888;
  font-size:11px
}

.mc-movement b {
  font-size:13px
}

.mc-movement button {
  background:transparent;
  border:0;
  color:#777;
  font-size:20px;
  cursor:pointer
}

.mc-methods > div {
  display:flex;
  justify-content:space-between;
  padding:8px 0;
  border-bottom:1px solid #222
}

.mc-form {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px
}

.mc-form label {
  font-size:11px;
  color:#888
}

.mc-form input {
  width:100%;
  margin-top:4px;
  padding:9px;
  background:#101010;
  border:1px solid #333;
  color:#fff;
  border-radius:6px
}

.mc-save {
  margin-top:10px;
  padding:10px 15px;
  background:#f1a80a;
  border:0;
  border-radius:7px;
  font-weight:800;
  cursor:pointer
}

.mc-opening {
  display:flex;
  gap:8px;
  align-items:end
}

.mc-opening input {
  padding:10px;
  background:#101010;
  border:1px solid #333;
  color:#fff;
  border-radius:6px
}

.mc-be {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px
}

.mc-be .mc-stat {
  background:#101010
}

.mc-note {
  color:#777;
  font-size:11px;
  margin-top:8px
}

@media(max-width:800px) {

  .mc-layout {
    grid-template-columns:1fr
  }

  .mc-stats {
    grid-template-columns:repeat(2,1fr)
  }

  .mc-form,
  .mc-be {
    grid-template-columns:1fr
  }

  .mc-panel {
    padding:12px
  }

  .mc-products {
    grid-template-columns:repeat(2,1fr)
  }

  .mc-product {
    padding:10px;
    font-size:12px
  }

}

`;

    document.head.appendChild(s);

  }

  function injectHTML() {

    const pos =
      document.createElement('div');

    pos.id =
      'mycfoods-pos';

    pos.innerHTML = `

      <div class="mc-panel">

        <div class="mc-top">

          <div>

            <div class="mc-title">
              MOSTRADOR
            </div>

            <div class="mc-sub">
              Venta rápida ·
              <span class="mc-pos-count">0</span>
              unidades
            </div>

          </div>

          <button
            class="mc-close"
            data-close-pos
          >
            Cerrar
          </button>

        </div>

        <div class="mc-layout">

          <div>

            <div class="mc-cats mc-pos-cats"></div>

            <div class="mc-products mc-pos-products"></div>

          </div>

          <aside class="mc-side">

            <div class="mc-sub">
              PEDIDO ACTUAL
            </div>

            <div class="mc-cart"></div>

            <div class="mc-total-row">
              <span>TOTAL</span>
              <span class="mc-total">$0</span>
            </div>

            <div class="mc-sub">
              Entrega
            </div>

            <div class="mc-delivery-buttons"></div>

            <div class="mc-sub">
              Forma de pago
            </div>

            <div class="mc-pay-buttons"></div>

            <div class="mc-sub">
              Dinero recibido (solo efectivo)
            </div>

            <input
              class="mc-received"
              type="number"
              inputmode="decimal"
              placeholder="$ 0"
            >

            <div class="mc-change-row">

              <span>
                Vuelto
              </span>

              <b class="mc-change">
                $0
              </b>

            </div>

            <button class="mc-confirm">
              COBRAR + IMPRIMIR
            </button>

            <div class="mc-actions">

              <button
                class="mc-secondary"
                data-clear-pos
              >
                Vaciar
              </button>

              <button
                class="mc-secondary"
                data-open-caja
              >
                CAJA
              </button>

            </div>

          </aside>

        </div>

      </div>

    `;

    document.body.appendChild(pos);

    const caja =
      document.createElement('div');

    caja.id =
      'mycfoods-caja';

    caja.innerHTML = `

      <div class="mc-panel">

        <div class="mc-top">

          <div>

            <div class="mc-title">
              CAJA MYCFOODS
            </div>

            <div class="mc-sub">
              Ventas, movimientos y control diario
            </div>

          </div>

          <button
            class="mc-close"
            data-close-caja
          >
            Cerrar
          </button>

        </div>

        <div class="mc-stats">

          <div class="mc-stat">
            <span>VENTAS HOY</span>
            <b data-stat="dayIn">$0</b>
          </div>

          <div class="mc-stat">
            <span>GASTOS HOY</span>
            <b data-stat="dayOut">$0</b>
          </div>

          <div class="mc-stat">
            <span>VENTAS MES</span>
            <b data-stat="monthIn">$0</b>
          </div>

          <div class="mc-stat">
            <span>RESULTADO MES</span>
            <b data-stat="result">$0</b>
          </div>

        </div>

        <div class="mc-tabs">

          <button
            class="mc-tab active"
            data-cview="resumen"
          >
            Resumen
          </button>

          <button
            class="mc-tab"
            data-cview="movimientos"
          >
            Movimientos
          </button>

          <button
            class="mc-tab"
            data-cview="equilibrio"
          >
            Punto de equilibrio
          </button>

          <button
            class="mc-tab"
            data-cview="mayor"
          >
            Libro mayor
          </button>

        </div>

        <div
          class="mc-cview"
          data-view="resumen"
        >

          <div class="mc-section">

            <h3>
              Apertura y cierre de efectivo
            </h3>

            <div class="mc-opening">

              <label>
                EFECTIVO INICIAL

                <br>

                <input
                  data-opening
                  type="number"
                  inputmode="decimal"
                  placeholder="$ 0"
                >

              </label>

              <button
                class="mc-save"
                data-save-opening
              >
                Guardar apertura
              </button>

            </div>

            <div
              class="mc-stat"
              style="margin-top:10px"
            >

              <span>
                EFECTIVO ESPERADO EN CAJA
              </span>

              <b data-stat="cashExpected">
                $0
              </b>

            </div>

            <div class="mc-note">
              Efectivo inicial + ventas en efectivo − gastos en efectivo.
            </div>

          </div>

          <div class="mc-section">

            <h3>
              Ventas por medio de pago
            </h3>

            <div class="mc-methods"></div>

          </div>

        </div>

        <div
          class="mc-cview"
          data-view="movimientos"
          style="display:none"
        >

          <div class="mc-section">

            <h3>
              Registrar gasto / movimiento
            </h3>

            <div class="mc-form">

              <label>
                MONTO
                <input
                  data-exp-amount
                  type="number"
                  inputmode="decimal"
                  placeholder="$ 0"
                >
              </label>

              <label>
                CATEGORÍA
                <input
                  data-exp-cat
                  placeholder="Insumos, luz, etc."
                >
              </label>

              <label>
                MEDIO

                <select data-exp-method>

                  <option>
                    Efectivo
                  </option>

                  <option>
                    Mercado Pago
                  </option>

                  <option>
                    Transferencia
                  </option>

                  <option>
                    Tarjeta
                  </option>

                </select>

              </label>

            </div>

            <button
              class="mc-save"
              data-add-expense
            >
              Registrar gasto
            </button>

          </div>

          <div class="mc-section">

            <h3>
              Últimos movimientos
            </h3>

            <div class="mc-movements"></div>

          </div>

        </div>

        <div
          class="mc-cview"
          data-view="equilibrio"
          style="display:none"
        >

          <div class="mc-section">

            <h3>
              Configuración
            </h3>

            <div class="mc-form">

              <label>
                COSTOS FIJOS / MES

                <input
                  data-be="fixed"
                  type="number"
                  placeholder="$ 0"
                >
              </label>

              <label>
                COSTO VARIABLE %

                <input
                  data-be="variable"
                  type="number"
                  placeholder="35"
                >
              </label>

              <label>
                TICKET PROMEDIO

                <input
                  data-be="avg"
                  type="number"
                  placeholder="$ 0"
                >
              </label>

            </div>

            <button
              class="mc-save"
              data-save-be
            >
              Guardar configuración
            </button>

          </div>

          <div class="mc-be">

            <div class="mc-stat">

              <span>
                FACTURACIÓN DE EQUILIBRIO
              </span>

              <b data-be="target">
                $0
              </b>

            </div>

            <div class="mc-stat">

              <span>
                TICKETS NECESARIOS / MES
              </span>

              <b data-be="units">
                —
              </b>

            </div>

            <div class="mc-stat">

              <span>
                VENTAS DEL MES
              </span>

              <b data-stat="monthIn">
                $0
              </b>

            </div>

          </div>

        </div>

        <div
          class="mc-cview"
          data-view="mayor"
          style="display:none"
        >

          <div class="mc-section">

            <h3>
              Libro mayor
            </h3>

            <div class="mc-methods"></div>

            <div class="mc-note">
              Para ver el detalle completo, usá Movimientos.
            </div>

          </div>

        </div>

      </div>

    `;

    document.body.appendChild(caja);

  }

  function bind() {

    document.addEventListener(
      'click',
      function(e) {

        const p =
          e.target.closest('[data-pidx]');

        if (p) {

          const prod =
            getProducts()[
              Number(p.dataset.pidx)
            ];

          if (prod) addPOS(prod);

          return;
        }

        const cat =
          e.target.closest('[data-cat]');

        if (cat) {

          currentCategory =
            cat.dataset.cat;

          renderPOS();

          return;
        }

        const q =
          e.target.closest('[data-q]');

        if (q) {

          changePOS(
            Number(q.dataset.q),
            Number(q.dataset.d)
          );

          return;
        }

        const pay =
          e.target.closest('[data-method]');

        if (pay) {

          posMethod =
            pay.dataset.method;

          renderPOS();

          return;
        }

        const del =
          e.target.closest('[data-delivery]');

        if (del) {

          posDelivery =
            del.dataset.delivery;

          renderPOS();

          return;
        }

        if (
          e.target.closest('[data-close-pos]')
        ) {

          closePOS();

          return;
        }

        if (
          e.target.closest('[data-close-caja]')
        ) {

          document
            .getElementById('mycfoods-caja')
            .classList.remove('open');

          return;
        }

        if (
          e.target.closest('[data-open-caja]')
        ) {

          document
            .getElementById('mycfoods-pos')
            .classList.remove('open');

          document
            .getElementById('mycfoods-caja')
            .classList.add('open');

          renderCaja();

          return;
        }

        if (
          e.target.closest('[data-clear-pos]')
        ) {

          posCart = [];

          renderPOS();

          return;
        }

        if (
          e.target.closest('.mc-confirm')
        ) {

          confirmPOS();

          return;
        }

        const cv =
          e.target.closest('[data-cview]');

        if (cv) {

          document
            .querySelectorAll(
              '#mycfoods-caja .mc-tab'
            )
            .forEach(
              x =>
                x.classList.remove('active')
            );

          cv.classList.add('active');

          document
            .querySelectorAll(
              '#mycfoods-caja .mc-cview'
            )
            .forEach(
              x =>
                x.style.display =
                  x.dataset.view ===
                  cv.dataset.cview
                    ? 'block'
                    : 'none'
            );

          renderCaja();

          return;
        }

        if (
          e.target.closest('[data-save-opening]')
        ) {

          const v =
            Number(
              document.querySelector(
                '[data-opening]'
              ).value || 0
            );

          state.openings[today()] = {
            amount:v
          };

          saveState();

          renderCaja();

          alert(
            'Apertura guardada.'
          );

          return;
        }

        if (
          e.target.closest('[data-add-expense]')
        ) {

          const amount =
            Number(
              document.querySelector(
                '[data-exp-amount]'
              ).value || 0
            );

          const cat =
            document.querySelector(
              '[data-exp-cat]'
            ).value.trim() ||
            'Gasto general';

          const method =
            document.querySelector(
              '[data-exp-method]'
            ).value;

          if (amount <= 0) {

            alert(
              'Ingresá un monto.'
            );

            return;
          }

          const now =
            new Date();

          addTx({
            id:uid(),
            date:today(),
            time:
              now.toLocaleTimeString(
                'es-AR',
                {
                  hour:'2-digit',
                  minute:'2-digit',
                  hour12:false
                }
              ),
            type:'egreso',
            category:cat,
            method,
            ledger:'principal',
            amount,
            note:'Gasto manual'
          });

          document.querySelector(
            '[data-exp-amount]'
          ).value = '';

          document.querySelector(
            '[data-exp-cat]'
          ).value = '';

          alert(
            'Gasto registrado.'
          );

          return;
        }

        const deltx =
          e.target.closest(
            '[data-del-tx]'
          );

        if (deltx) {

          if (
            confirm(
              '¿Eliminar este movimiento?'
            )
          ) {

            state.transactions =
              state.transactions.filter(
                x =>
                  x.id !==
                  deltx.dataset.delTx
              );

            saveState();

            renderCaja();

          }

          return;
        }

        if (
          e.target.closest('[data-save-be]')
        ) {

          state.config.fixedCosts =
            document.querySelector(
              '[data-be="fixed"]'
            ).value;

          state.config.variablePct =
            document.querySelector(
              '[data-be="variable"]'
            ).value;

          state.config.avgTicket =
            document.querySelector(
              '[data-be="avg"]'
            ).value;

          saveState();

          renderCaja();

          alert(
            'Configuración guardada.'
          );

          return;
        }

      }
    );

    document.addEventListener(
      'input',
      function(e) {

        if (
          e.target.classList.contains(
            'mc-received'
          )
        ) {
          renderPOS();
        }

      }
    );

    document.addEventListener(
      'keydown',
      function(e) {

        if (e.key === 'Escape') {

          closePOS();

          document
            .getElementById('mycfoods-caja')
            ?.classList.remove('open');

        }

      }
    );

  }

  function addNavButton() {

    const nav =
      document.querySelector(
        '.nav-links'
      );

    if (
      !nav ||
      document.getElementById(
        'btn-mycfoods-pos'
      )
    ) return;

    const a =
      document.createElement('a');

    a.id =
      'btn-mycfoods-pos';

    a.href = '#';

    a.className =
      'btn-nav';

    a.innerHTML =
      'MOSTRADOR';

    a.addEventListener(
      'click',
      e => {

        e.preventDefault();

        openPOS();

      }
    );

    nav.appendChild(a);

  }

  function init() {

    injectStyles();
    injectHTML();
    bind();
    addNavButton();

    setTimeout(
      () => {

        currentCategory =
          categories()[0] || '';

        renderPOS();
        renderCaja();

      },
      700
    );

  }

  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();

  }

})();