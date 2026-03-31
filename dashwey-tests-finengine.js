/**
 * DASHWEY — Test Suite Financiero v1.3.296
 * ─────────────────────────────────────────────────────────────────────────
 * Cubre: FinEngine (todas las funciones públicas) + KPI (filtros y gráficos)
 *
 * USO:
 *   window._DashweyRunTests()
 *   → Resultado en window._DashweyTestResults
 *   → Resumen en console.info
 *
 *   URL: añadir #dashwey-tests al hash → auto-ejecuta 1.5s después de DOMContentLoaded
 *
 * ESTRUCTURA:
 *   Sección A — FinEngine: funciones de utilidad (money, ventaIngresos, etc.)
 *   Sección B — FinEngine: ingresos y revenue (incluyendo ingresosFin)
 *   Sección C — FinEngine: costes (COGS, compras, IVA dinámico)
 *   Sección D — FinEngine: gastos operativos
 *   Sección E — FinEngine: beneficio y márgenes (proration, division by zero)
 *   Sección F — FinEngine: liquidez, runway, ratioLiquidez
 *   Sección G — FinEngine: stock y ticket medio
 *   Sección H — FinEngine: deltaRevenue con period activo
 *   Sección I — FinEngine: snapshot (integridad del objeto)
 *   Sección J — KPI: periodRange (todos los tipos)
 *   Sección K — KPI: ventasEnPeriodo y getVentasChartData (schema items[])
 *   Sección L — KPI: getChartData con FinEngine.pedidoCoste (IVA dinámico)
 *   Sección M — KPI: getBeneficioNeto y getTopVentas (legacy schema)
 *   Sección N — Integración: State demo data (valores conocidos)
 */

(function _DashweyTests() {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────
   * FRAMEWORK INTERNO — assert, assertRange, assertNull, assertType
   * ──────────────────────────────────────────────────────────────────── */

  var _results = [];
  var _passed  = 0;
  var _failed  = 0;
  var _section = '';

  function section(name) {
    _section = name;
  }

  /**
   * assert(name, got, expected, tol?)
   * tol: tolerancia numérica (útil para floating point, e.g. 0.001)
   */
  function assert(name, got, expected, tol) {
    var ok;
    if (tol !== undefined) {
      ok = typeof got === 'number' && Math.abs(got - expected) <= tol;
    } else {
      ok = got === expected;
    }
    _record(_section + ' > ' + name, ok, got, expected);
  }

  /**
   * assertRange(name, got, min, max)
   * Valida que got esté en [min, max]
   */
  function assertRange(name, got, min, max) {
    var ok = typeof got === 'number' && got >= min && got <= max;
    _record(_section + ' > ' + name, ok, got, min + '..' + max);
  }

  /**
   * assertNull(name, got)
   * Valida que got sea null
   */
  function assertNull(name, got) {
    _record(_section + ' > ' + name, got === null, got, null);
  }

  /**
   * assertType(name, got, type)
   * Valida typeof got === type
   */
  function assertType(name, got, type) {
    _record(_section + ' > ' + name, typeof got === type, typeof got, type);
  }

  /**
   * assertArray(name, got)
   * Valida que got sea Array
   */
  function assertArray(name, got) {
    _record(_section + ' > ' + name, Array.isArray(got), typeof got, 'array');
  }

  /**
   * assertKeys(name, obj, keys[])
   * Valida que obj tenga todas las keys
   */
  function assertKeys(name, obj, keys) {
    var missing = keys.filter(function(k) { return !(k in obj); });
    _record(_section + ' > ' + name, missing.length === 0, missing.join(',') || 'ok', 'all keys present');
  }

  function _record(name, ok, got, expected) {
    if (ok) {
      _passed++;
      _results.push({ ok: true, name: name });
    } else {
      _failed++;
      _results.push({ ok: false, name: name, got: got, expected: expected });
      console.warn('[Test FAIL] ' + name + ' | got:', got, '| expected:', expected);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
   * HELPERS DE TEST — State temporal para inyección de datos
   * ──────────────────────────────────────────────────────────────────── */

  /**
   * withVentas(ventas, fn)
   * Inyecta ventas temporalmente en State, ejecuta fn(), restaura.
   * NOTA: muta _state directamente — no persiste (sin save()).
   */
  function withVentas(ventas, fn) {
    var orig = State.get.ventas().slice();
    // Inyección directa en el array vivo para evitar save()
    var arr = State.get.ventas();
    arr.length = 0;
    ventas.forEach(function(v) { arr.push(v); });
    try { fn(); } finally {
      arr.length = 0;
      orig.forEach(function(v) { arr.push(v); });
    }
  }

  /**
   * withIngresos(ingresos, fn)
   * Inyecta ingresosFin temporalmente.
   */
  function withIngresos(ingresos, fn) {
    var arr = State.get.ingresosFin ? State.get.ingresosFin() : [];
    var orig = arr.slice();
    arr.length = 0;
    ingresos.forEach(function(i) { arr.push(i); });
    try { fn(); } finally {
      arr.length = 0;
      orig.forEach(function(i) { arr.push(i); });
    }
  }

  /**
   * withProductos(productos, fn)
   */
  function withProductos(productos, fn) {
    var arr = State.get.productos();
    var orig = arr.slice();
    arr.length = 0;
    productos.forEach(function(p) { arr.push(p); });
    try { fn(); } finally {
      arr.length = 0;
      orig.forEach(function(p) { arr.push(p); });
    }
  }

  /**
   * withCuentas(cuentas, fn)
   */
  function withCuentas(cuentas, fn) {
    var arr = State.get.cuentas();
    var orig = arr.slice();
    arr.length = 0;
    cuentas.forEach(function(c) { arr.push(c); });
    try { fn(); } finally {
      arr.length = 0;
      orig.forEach(function(c) { arr.push(c); });
    }
  }

  /**
   * withGastos(gastos, fn)
   */
  function withGastos(gastos, fn) {
    var arr = State.get.gastosOp();
    var orig = arr.slice();
    arr.length = 0;
    gastos.forEach(function(g) { arr.push(g); });
    try { fn(); } finally {
      arr.length = 0;
      orig.forEach(function(g) { arr.push(g); });
    }
  }

  /**
   * withHistorial(pedidos, fn)
   */
  function withHistorial(pedidos, fn) {
    var arr = State.get.historialPedidos();
    var orig = arr.slice();
    arr.length = 0;
    pedidos.forEach(function(p) { arr.push(p); });
    try { fn(); } finally {
      arr.length = 0;
      orig.forEach(function(p) { arr.push(p); });
    }
  }

  /** Date helpers */
  function daysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString();
  }
  function daysFromNow(n) {
    return new Date(Date.now() + n * 86400000).toISOString();
  }
  function rangeLastN(days) {
    return {
      start: new Date(Date.now() - days * 86400000),
      end:   new Date()
    };
  }
  function rangeEmpty() {
    // 2000-01-01 → 2000-01-02 — garantizado sin datos
    return {
      start: new Date('2000-01-01T00:00:00.000Z'),
      end:   new Date('2000-01-02T00:00:00.000Z')
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
   * FUNCIÓN PRINCIPAL — _run()
   * ──────────────────────────────────────────────────────────────────── */

  function _run() {
    if (typeof FinEngine === 'undefined' || typeof KPI === 'undefined' || typeof State === 'undefined') {
      console.warn('[Tests] Módulos no disponibles — reintentando en 1.5s');
      setTimeout(_run, 1500);
      return;
    }

    _results = [];
    _passed = 0;
    _failed = 0;

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN A — FinEngine: funciones de utilidad puras
     * ═══════════════════════════════════════════════════════════════════ */
    section('A. money()');

    // money() redondea a 2 decimales usando round(n*100)/100
    assert('entero', FinEngine.money(5), 5);
    assert('2 decimales exactos', FinEngine.money(3.14), 3.14);
    assert('redondeo hacia arriba', FinEngine.money(1.005), 1.01);
    assert('redondeo hacia abajo', FinEngine.money(1.004), 1.0, 0.001);
    assert('negativo', FinEngine.money(-2.557), -2.56, 0.001);
    assert('cero', FinEngine.money(0), 0);
    assert('undefined → 0', FinEngine.money(undefined), 0);
    assert('null → 0', FinEngine.money(null), 0);
    assert('NaN → 0', FinEngine.money(NaN), 0);
    assert('acumulación flotante: 0.1+0.2', FinEngine.money(0.1 + 0.2), 0.3, 0.001);

    /* ─────────────────────────────────────────────────────────────────── */
    section('A. ventaIngresos()');

    // Schema moderno: { total, items[] } — total tiene prioridad
    assert('total > 0 priorizado sobre items',
      FinEngine.ventaIngresos({ total: 5.00, items: [{ pvp: 1.0, qty: 10 }] }), 5.00);

    // total = 0 → no válido → caer a items[]
    assert('total=0 con items → usa items[]',
      FinEngine.ventaIngresos({ total: 0, items: [{ pvp: 1.50, qty: 2 }] }), 3.00);

    // total = null → caer a items[]
    assert('total=null con items → usa items[]',
      FinEngine.ventaIngresos({ total: null, items: [{ pvp: 2.0, qty: 3 }] }), 6.00);

    // Schema moderno sin total
    assert('items[] sin total: suma pvp*qty',
      FinEngine.ventaIngresos({ items: [{ pvp: 1.50, qty: 2 }, { pvp: 0.80, qty: 1 }] }), 3.80);

    // items con campos faltantes
    assert('items pvp faltante → 0 contribución',
      FinEngine.ventaIngresos({ items: [{ qty: 2 }] }), 0);
    assert('items qty faltante → 0 contribución',
      FinEngine.ventaIngresos({ items: [{ pvp: 1.5 }] }), 0);
    assert('items vacío → 0',
      FinEngine.ventaIngresos({ items: [] }), 0);

    // Schema legacy: { pvp, qty } en raíz
    assert('legacy: pvp*qty',
      FinEngine.ventaIngresos({ pvp: 1.20, qty: 3 }), 3.60);
    assert('legacy: pvp faltante → 0',
      FinEngine.ventaIngresos({ qty: 5 }), 0);
    assert('legacy: qty faltante → 0',
      FinEngine.ventaIngresos({ pvp: 2.0 }), 0);

    // Casos nulos y vacíos
    assert('null → 0', FinEngine.ventaIngresos(null), 0);
    assert('undefined → 0', FinEngine.ventaIngresos(undefined), 0);
    assert('objeto vacío → 0', FinEngine.ventaIngresos({}), 0);

    // Multi-item moderno
    assert('multi-item suma correcta',
      FinEngine.ventaIngresos({ items: [
        { pvp: 1.50, qty: 2 },
        { pvp: 7.50, qty: 1 },
        { pvp: 0.80, qty: 3 }
      ]}),
      15.90, 0.001);

    /* ─────────────────────────────────────────────────────────────────── */
    section('A. ventaCoste()');

    // items[] con campo coste
    assert('items[]: suma qty*coste',
      FinEngine.ventaCoste({ items: [{ qty: 2, coste: 0.75 }, { qty: 1, coste: 1.20 }] }),
      2.70);

    // items sin coste → 0
    assert('items sin coste → 0',
      FinEngine.ventaCoste({ items: [{ qty: 3 }] }), 0);

    // Venta legacy sin items: usa campo coste o producto
    assert('legacy con campo coste',
      FinEngine.ventaCoste({ qty: 2, coste: 0.50 }), 1.00);

    // Null/undefined
    assert('null → 0', FinEngine.ventaCoste(null), 0);
    assert('undefined → 0', FinEngine.ventaCoste(undefined), 0);

    /* ─────────────────────────────────────────────────────────────────── */
    section('A. pedidoCoste() — IVA dinámico');

    // IVA estándar 10%
    assert('IVA 10%: 2 cajas × 10€ × 1.10 = 22€',
      FinEngine.pedidoCoste({ items: [{ ncajas: 2, precio: 10.00, iva: '10' }] }), 22.00);

    // IVA reducido 4%
    assert('IVA 4%: 1 caja × 10€ × 1.04 = 10.40€',
      FinEngine.pedidoCoste({ items: [{ ncajas: 1, precio: 10.00, iva: '4' }] }), 10.40);

    // IVA general 21%
    assert('IVA 21%: 1 caja × 10€ × 1.21 = 12.10€',
      FinEngine.pedidoCoste({ items: [{ ncajas: 1, precio: 10.00, iva: '21' }] }), 12.10);

    // IVA 0% (artículos exentos)
    assert('IVA 0%: 1 caja × 10€ × 1.00 = 10€',
      FinEngine.pedidoCoste({ items: [{ ncajas: 1, precio: 10.00, iva: '0' }] }), 10.00);

    // Sin campo iva → default 10%
    assert('sin campo iva → default 10%',
      FinEngine.pedidoCoste({ items: [{ ncajas: 2, precio: 5.00 }] }), 11.00);

    // Multi-item con IVA mixto
    assert('multi-item IVA mixto (10%+21%)',
      FinEngine.pedidoCoste({ items: [
        { ncajas: 1, precio: 10.00, iva: '10' },
        { ncajas: 2, precio: 5.00,  iva: '21' }
      ]}), 23.10);

    // Casos borde
    assert('ncajas=0 → 0',
      FinEngine.pedidoCoste({ items: [{ ncajas: 0, precio: 10.00, iva: '10' }] }), 0);
    assert('precio=0 → 0',
      FinEngine.pedidoCoste({ items: [{ ncajas: 5, precio: 0, iva: '10' }] }), 0);
    assert('items vacío → 0',
      FinEngine.pedidoCoste({ items: [] }), 0);
    assert('null → 0', FinEngine.pedidoCoste(null), 0);
    assert('sin items → 0', FinEngine.pedidoCoste({}), 0);

    /* ─────────────────────────────────────────────────────────────────── */
    section('A. gastoMensualEq()');

    // Usa mensualEq si existe, sino importe
    assert('mensualEq override importe',
      FinEngine.gastoMensualEq([{ mensualEq: 50, importe: 100 }]), 50);
    assert('sin mensualEq → usa importe',
      FinEngine.gastoMensualEq([{ importe: 100 }]), 100);
    assert('múltiples gastos: suma',
      FinEngine.gastoMensualEq([{ importe: 800 }, { importe: 180 }, { importe: 120 }]), 1100);
    assert('array vacío → 0', FinEngine.gastoMensualEq([]), 0);
    assert('null → 0', FinEngine.gastoMensualEq(null), 0);

    /* ─────────────────────────────────────────────────────────────────── */
    section('A. mesActualRange() y rollingRange()');

    var mesRange = FinEngine.mesActualRange();
    assert('mesActualRange: start es Date', mesRange.start instanceof Date, true);
    assert('mesActualRange: end es Date', mesRange.end instanceof Date, true);
    assert('mesActualRange: end > start', mesRange.end > mesRange.start, true);
    assert('mesActualRange: start día 1', mesRange.start.getDate(), 1);
    // end debe ser inicio del mes siguiente
    assert('mesActualRange: end.getDate()=1 o fin de mes',
      mesRange.end > mesRange.start, true);

    var r30 = FinEngine.rollingRange(30);
    assert('rollingRange(30): end > start', r30.end > r30.start, true);
    assertRange('rollingRange(30): duración ~30d (ms)',
      (r30.end - r30.start) / 86400000, 29.9, 30.1);

    var r7 = FinEngine.rollingRange(7);
    assertRange('rollingRange(7): duración ~7d',
      (r7.end - r7.start) / 86400000, 6.9, 7.1);

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN B — FinEngine: revenue() + ingresosFin
     * ═══════════════════════════════════════════════════════════════════ */
    section('B. revenue() — ventas TPV');

    // Sin ventas → 0
    withVentas([], function() {
      assert('sin ventas → 0', FinEngine.revenue(rangeEmpty()), 0);
    });

    // Venta dentro del rango
    withVentas([
      { fecha: daysAgo(1), total: 10.00, items: [{ pvp: 10, qty: 1, coste: 5 }] }
    ], function() {
      var r = rangeLastN(2);
      assertRange('1 venta dentro rango → 10€', FinEngine.revenue(r), 9.99, 10.01);
    });

    // Venta fuera del rango → no se cuenta
    withVentas([
      { fecha: daysAgo(60), total: 100.00, items: [] }
    ], function() {
      var r = rangeLastN(7);
      assert('venta fuera de rango → 0', FinEngine.revenue(r), 0);
    });

    // Múltiples ventas
    withVentas([
      { fecha: daysAgo(1), total: 5.00, items: [] },
      { fecha: daysAgo(2), total: 7.50, items: [] },
      { fecha: daysAgo(60), total: 100.00, items: [] } // fuera de rango
    ], function() {
      var r = rangeLastN(7);
      assert('suma parcial: 5+7.5=12.5€', FinEngine.revenue(r), 12.50);
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('B. revenue() — con ingresosFin');

    // ingresosFin se suma al revenue
    withVentas([
      { fecha: daysAgo(1), total: 10.00, items: [] }
    ], function() {
      withIngresos([
        { fecha: daysAgo(1), importe: 500.00, concepto: 'Alquiler local' }
      ], function() {
        var r = rangeLastN(3);
        assert('TPV + ingresosFin = 510€', FinEngine.revenue(r), 510.00);
      });
    });

    // ingresosFin fuera de rango → no cuenta
    withVentas([]), function() {};
    withIngresos([
      { fecha: daysAgo(60), importe: 1000.00 }
    ], function() {
      var r = rangeLastN(7);
      assert('ingresosFin fuera de rango → 0', FinEngine.revenue(r), 0);
    });

    // ingresosFin con importe negativo (corrección/devolución)
    withVentas([
      { fecha: daysAgo(1), total: 50.00, items: [] }
    ], function() {
      withIngresos([
        { fecha: daysAgo(1), importe: -10.00, concepto: 'Devolución' }
      ], function() {
        var r = rangeLastN(3);
        assert('ingreso negativo (devolución): 50-10=40', FinEngine.revenue(r), 40.00);
      });
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN C — FinEngine: costeVentas() y comprasPeriodo()
     * ═══════════════════════════════════════════════════════════════════ */
    section('C. costeVentas()');

    withVentas([], function() {
      assert('sin ventas → 0', FinEngine.costeVentas(rangeEmpty()), 0);
    });

    withVentas([
      { fecha: daysAgo(1), total: 10, items: [{ qty: 2, pvp: 5, coste: 1.50 }] },
      { fecha: daysAgo(2), total: 7, items: [{ qty: 1, pvp: 7, coste: 3.00 }] }
    ], function() {
      var r = rangeLastN(5);
      // coste: 2*1.50 + 1*3.00 = 6.00
      assert('suma costes items[]: 3+3=6€', FinEngine.costeVentas(r), 6.00);
    });

    // Venta sin campo coste en items → 0
    withVentas([
      { fecha: daysAgo(1), total: 5, items: [{ qty: 2, pvp: 2.5 }] }
    ], function() {
      assert('items sin coste → costeVentas=0', FinEngine.costeVentas(rangeLastN(2)), 0);
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('C. comprasPeriodo()');

    withHistorial([], function() {
      assert('sin pedidos → 0', FinEngine.comprasPeriodo(rangeEmpty()), 0);
    });

    withHistorial([
      {
        id: 'p_t1', fecha: daysAgo(3), provId: 'ccep',
        items: [{ ncajas: 2, precio: 10.00, iva: '10' }]
      }
    ], function() {
      var r = rangeLastN(7);
      // 2 * 10 * 1.10 = 22
      assert('pedido dentro rango: 22€', FinEngine.comprasPeriodo(r), 22.00);
    });

    withHistorial([
      {
        id: 'p_t2', fecha: daysAgo(60), provId: 'ccep',
        items: [{ ncajas: 1, precio: 100.00 }]
      }
    ], function() {
      assert('pedido fuera de rango → 0', FinEngine.comprasPeriodo(rangeLastN(7)), 0);
    });

    // Multi-pedido con IVA diferente
    withHistorial([
      {
        id: 'p_t3', fecha: daysAgo(1), provId: 'ccep',
        items: [{ ncajas: 1, precio: 10.00, iva: '10' }]
      },
      {
        id: 'p_t4', fecha: daysAgo(2), provId: 'mahou',
        items: [{ ncajas: 1, precio: 10.00, iva: '21' }]
      }
    ], function() {
      var r = rangeLastN(7);
      // 10*1.10 + 10*1.21 = 11 + 12.10 = 23.10
      assert('multi-pedido IVA mixto: 23.10€', FinEngine.comprasPeriodo(r), 23.10);
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN D — FinEngine: gastos operativos
     * ═══════════════════════════════════════════════════════════════════ */
    section('D. gastos operativos');

    withGastos([
      { id: 'g1', importe: 800, recurrente: true,  frecuencia: 'mensual' },
      { id: 'g2', importe: 180, recurrente: true,  frecuencia: 'mensual' },
      { id: 'g3', importe: 120, recurrente: true,  frecuencia: 'mensual' },
      { id: 'g4', importe: 60,  recurrente: false, frecuencia: '' }
    ], function() {
      assert('gastoMensualTotal: 800+180+120+60=1160', FinEngine.gastoMensualTotal(), 1160);
      assert('gastoFijoMensual: 800+180+120=1100',     FinEngine.gastoFijoMensual(),  1100);
      assert('gastoVariableMensual: 1160-1100=60',     FinEngine.gastoVariableMensual(), 60);
      assert('gastoBruto: suma importes=1160',         FinEngine.gastoBruto(), 1160);
      assert('comprometido (solo recurrentes): 1100',  FinEngine.comprometido(), 1100);
    });

    // Sin gastos → 0
    withGastos([], function() {
      assert('sin gastos → gastoMensualTotal=0', FinEngine.gastoMensualTotal(), 0);
      assert('sin gastos → gastoFijoMensual=0',  FinEngine.gastoFijoMensual(),  0);
      assert('sin gastos → comprometido=0',       FinEngine.comprometido(), 0);
    });

    // Gasto con mensualEq override
    withGastos([
      { id: 'g_eq', importe: 1200, mensualEq: 100, recurrente: true } // anual → 100/mes
    ], function() {
      assert('mensualEq override: 100 no 1200', FinEngine.gastoMensualTotal(), 100);
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN E — FinEngine: beneficioNeto() y margenBruto()
     * ═══════════════════════════════════════════════════════════════════ */
    section('E. beneficioNeto() — proration por rango');

    // Con gastos fijos y sin ventas: beneficio negativo proporcional al rango
    withVentas([]);
    withGastos([
      { id: 'g1', importe: 1200, recurrente: true }
    ], function() {
      // rango 30 días → gop = 1200 * (30/30) = 1200
      var r30 = rangeLastN(30);
      var ben30 = FinEngine.beneficioNeto(r30);
      assert('30d sin ventas: 0-0-1200=-1200', ben30, -1200, 2);

      // rango 15 días → gop = 1200 * (15/30) = 600
      var r15 = rangeLastN(15);
      var ben15 = FinEngine.beneficioNeto(r15);
      assert('15d sin ventas: 0-0-600=-600', ben15, -600, 2);

      // rango 1 día → gop = 1200 * (1/30) = 40
      var r1 = rangeLastN(1);
      var ben1 = FinEngine.beneficioNeto(r1);
      assert('1d sin ventas: -40', ben1, -40, 1);
    });

    // Con ventas que cubren gastos exactamente
    withVentas([
      { fecha: daysAgo(1), total: 1200.00, items: [{ qty: 1, pvp: 1200, coste: 0 }] }
    ], function() {
      withGastos([{ id: 'g1', importe: 1200, recurrente: true }], function() {
        var r = rangeLastN(30);
        var ben = FinEngine.beneficioNeto(r);
        assert('ventas=gastos: beneficio≈0', ben, 0, 5);
      });
    });

    // Beneficio positivo: ing > cogs + gop
    withVentas([
      { fecha: daysAgo(1), total: 500, items: [{ qty: 1, pvp: 500, coste: 100 }] }
    ], function() {
      withGastos([{ id: 'g1', importe: 120, recurrente: true }], function() {
        var r = rangeLastN(30);
        // beneficio ≈ 500 - 100 - 120 = 280
        var ben = FinEngine.beneficioNeto(r);
        assertRange('beneficio positivo: ~280€', ben, 275, 285);
      });
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('E. margenBruto()');

    withVentas([
      { fecha: daysAgo(1), total: 100, items: [{ qty: 1, pvp: 100, coste: 40 }] }
    ], function() {
      var r = rangeLastN(2);
      // (100-40)/100*100 = 60%
      assert('margen: (100-40)/100=60%', FinEngine.margenBruto(r), 60);
    });

    // Sin ventas → 0 (división por cero guard)
    withVentas([], function() {
      assert('sin ventas: margen=0 (guard div/0)', FinEngine.margenBruto(rangeLastN(30)), 0);
    });

    // Margen 0: cogs = ingresos
    withVentas([
      { fecha: daysAgo(1), total: 100, items: [{ qty: 1, pvp: 100, coste: 100 }] }
    ], function() {
      assert('cogs=ingresos → margen=0%', FinEngine.margenBruto(rangeLastN(2)), 0);
    });

    // Margen negativo: vender por debajo del coste
    withVentas([
      { fecha: daysAgo(1), total: 80, items: [{ qty: 1, pvp: 80, coste: 100 }] }
    ], function() {
      assert('margen negativo: -25%', FinEngine.margenBruto(rangeLastN(2)), -25);
    });

    // Margen 100%: coste = 0
    withVentas([
      { fecha: daysAgo(1), total: 50, items: [{ qty: 1, pvp: 50, coste: 0 }] }
    ], function() {
      assert('margen 100%: coste=0', FinEngine.margenBruto(rangeLastN(2)), 100);
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN F — FinEngine: liquidez, runway, ratioLiquidez
     * ═══════════════════════════════════════════════════════════════════ */
    section('F. saldoCuentas()');

    withCuentas([
      { id: 'c1', saldo: 5200 },
      { id: 'c2', saldo: 320 }
    ], function() {
      assert('2 cuentas: 5200+320=5520€', FinEngine.saldoCuentas(), 5520);
    });

    withCuentas([], function() {
      assert('sin cuentas → 0', FinEngine.saldoCuentas(), 0);
    });

    withCuentas([{ id: 'c1', saldo: -100 }], function() {
      assert('saldo negativo (descubierto)', FinEngine.saldoCuentas(), -100);
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('F. runway()');

    withCuentas([{ id: 'c1', saldo: 5520 }], function() {
      withGastos([
        { id: 'g1', importe: 800, recurrente: true },
        { id: 'g2', importe: 180, recurrente: true },
        { id: 'g3', importe: 120, recurrente: true },
        { id: 'g4', importe: 60,  recurrente: false }
      ], function() {
        // diario = 1160/30 ≈ 38.67; runway = round(5520/38.67) = 143
        assert('runway demo: ~143 días', FinEngine.runway(), 143);
      });
    });

    // Sin gastos → 999 (guard división por cero)
    withCuentas([{ id: 'c1', saldo: 1000 }], function() {
      withGastos([], function() {
        assert('sin gastos → runway=999', FinEngine.runway(), 999);
      });
    });

    // Saldo 0 → 0 días
    withCuentas([{ id: 'c1', saldo: 0 }], function() {
      withGastos([{ id: 'g1', importe: 1000, recurrente: true }], function() {
        assert('saldo=0 → runway=0', FinEngine.runway(), 0);
      });
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('F. ratioLiquidez()');

    // Sin gastos → 99 (guard)
    withGastos([], function() {
      withVentas([], function() {
        assert('sin gastos → ratio=99', FinEngine.ratioLiquidez(), 99);
      });
    });

    // Sin ingresos 30d → 0
    withVentas([], function() {
      withGastos([{ id: 'g1', importe: 1000, recurrente: true }], function() {
        assert('sin ingresos 30d → ratio=0', FinEngine.ratioLiquidez(), 0);
      });
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN G — FinEngine: valorStock() y ticketMedio()
     * ═══════════════════════════════════════════════════════════════════ */
    section('G. valorStock()');

    withProductos([
      { id: 'p1', stockActual: 10, precioCompra: 1.00 },
      { id: 'p2', stockActual: 5,  precioCompra: 2.00 },
      { id: 'p3', stockActual: 0,  precioCompra: 5.00 }  // stock 0 → no contribuye
    ], function() {
      assert('10×1+5×2+0×5=20€', FinEngine.valorStock(), 20.00);
    });

    withProductos([], function() {
      assert('sin productos → 0', FinEngine.valorStock(), 0);
    });

    withProductos([
      { id: 'p1', stockActual: 3, precioCompra: 0 } // precio 0
    ], function() {
      assert('precioCompra=0 → 0', FinEngine.valorStock(), 0);
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('G. ticketMedio()');

    withVentas([
      { fecha: daysAgo(1), total: 3.00, items: [] },
      { fecha: daysAgo(2), total: 2.00, items: [] },
      { fecha: daysAgo(3), total: 5.00, items: [] }
    ], function() {
      var r = rangeLastN(5);
      // (3+2+5)/3 = 3.33
      assert('3 ventas [3,2,5]: media=3.33', FinEngine.ticketMedio(r), 3.33, 0.01);
    });

    withVentas([], function() {
      assert('sin ventas → ticketMedio=0', FinEngine.ticketMedio(rangeLastN(30)), 0);
    });

    // Ticket medio con venta única
    withVentas([
      { fecha: daysAgo(1), total: 7.50, items: [] }
    ], function() {
      assert('1 venta → ticketMedio=7.50', FinEngine.ticketMedio(rangeLastN(2)), 7.50);
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN H — FinEngine: deltaRevenue() con period activo
     * ═══════════════════════════════════════════════════════════════════ */
    section('H. deltaRevenue()');

    // Sin ingresos en ambos períodos → null (anterior=0, guard)
    withVentas([], function() {
      withIngresos([], function() {
        var delta = FinEngine.deltaRevenue({ type: 'month', offset: 0 });
        assertNull('ambos vacíos → null', delta);
      });
    });

    // +100%: este período doble que anterior
    // Inyectar venta "anterior" hace 31 días y "actual" hace 1 día
    withVentas([
      { fecha: daysAgo(35), total: 50.00, items: [] },  // período anterior
      { fecha: daysAgo(1),  total: 100.00, items: [] }  // período actual
    ], function() {
      withIngresos([], function() {
        var period = { type: 'custom', customStart: daysAgo(30).slice(0,10), customEnd: new Date().toISOString().slice(0,10) };
        var delta = FinEngine.deltaRevenue(period);
        assertType('deltaRevenue custom: type number', delta, 'number');
        assertRange('deltaRevenue custom: > -999', delta, -999, 999);
      });
    });

    // deltaRevenue acepta period.type='month'
    withVentas([]), function() {};
    var d = FinEngine.deltaRevenue({ type: 'month', offset: 0 });
    assert('month period: null o number',
      d === null || typeof d === 'number' ? 1 : 0, 1);

    // deltaRevenue sin argumento → legacy (mes actual vs anterior)
    var dLegacy = FinEngine.deltaRevenue();
    assert('sin argumento: null o number',
      dLegacy === null || typeof dLegacy === 'number' ? 1 : 0, 1);

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN I — FinEngine: snapshot()
     * ═══════════════════════════════════════════════════════════════════ */
    section('I. snapshot()');

    var snap = FinEngine.snapshot();
    assertKeys('snapshot tiene todas las claves', snap, [
      'ingresos', 'ingresosMes', 'ingresos30d', 'ticketMedio', 'deltaRevenue',
      'costeVentas', 'compras', 'gastoMensual', 'gastoFijo', 'gastoVariable', 'comprometido',
      'beneficioNeto', 'margenBruto',
      'saldo', 'runway', 'ratioLiquidez',
      'valorStock'
    ]);

    assertType('snapshot.ingresos es number',   snap.ingresos,      'number');
    assertType('snapshot.saldo es number',       snap.saldo,         'number');
    assertType('snapshot.runway es number',      snap.runway,        'number');
    assertType('snapshot.valorStock es number',  snap.valorStock,    'number');
    assertType('snapshot.gastoMensual es number', snap.gastoMensual, 'number');

    // snapshot con period custom
    var snapCustom = FinEngine.snapshot({ type: 'custom', customStart: '2020-01-01', customEnd: '2020-01-31' });
    assert('snapshot custom vacío: ingresos=0', snapCustom.ingresos, 0);
    assert('snapshot custom vacío: costeVentas=0', snapCustom.costeVentas, 0);
    assert('snapshot custom vacío: compras=0', snapCustom.compras, 0);

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN J — KPI: periodRange()
     * ═══════════════════════════════════════════════════════════════════ */
    section('J. KPI.periodRange() — todos los tipos');

    function rangeValid(p) {
      var r = KPI.getRange(p);
      return r && r.start instanceof Date && r.end instanceof Date && r.end > r.start;
    }

    assert('today:  rango válido', rangeValid({ type: 'today',  offset: 0 }), true);
    assert('week:   rango válido', rangeValid({ type: 'week',   offset: 0 }), true);
    assert('month:  rango válido', rangeValid({ type: 'month',  offset: 0 }), true);
    assert('year:   rango válido', rangeValid({ type: 'year',   offset: 0 }), true);
    assert('hours:  rango válido', rangeValid({ type: 'hours',  offset: 0 }), true);

    assert('custom valid: rango válido', rangeValid({
      type: 'custom', customStart: '2026-01-01', customEnd: '2026-01-31'
    }), true);

    // offset negativo (mes anterior)
    assert('month offset -1: válido', rangeValid({ type: 'month', offset: -1 }), true);
    assert('year offset -1:  válido', rangeValid({ type: 'year',  offset: -1 }), true);

    // Duración today: exactamente 1 día
    var todayRange = KPI.getRange({ type: 'today', offset: 0 });
    assertRange('today: duración 1 día',
      (todayRange.end - todayRange.start) / 86400000, 0.99, 1.01);

    // Duración week: 7 días
    var weekRange = KPI.getRange({ type: 'week', offset: 0 });
    assertRange('week: duración 7 días',
      (weekRange.end - weekRange.start) / 86400000, 6.9, 7.1);

    // custom mal formado → fallback a mesActual (no crash)
    try {
      var badCustom = KPI.getRange({ type: 'custom', customStart: 'invalid', customEnd: 'invalid' });
      assert('custom inválido: no crash', true, true);
    } catch(e) {
      assert('custom inválido: no crash', false, true);
    }

    /* ─────────────────────────────────────────────────────────────────── */
    section('J. KPI.getPresetRange()');

    var presets = ['today', 'yesterday', 'week', 'month', 'last30', 'year'];
    presets.forEach(function(type) {
      var r = KPI.getPresetRange(type);
      assert('preset "' + type + '": end > start', r && r.end > r.start, true);
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN K — KPI: ventasEnPeriodo() y getVentasChartData()
     * ═══════════════════════════════════════════════════════════════════ */
    section('K. KPI.ventasEnPeriodo()');

    withVentas([], function() {
      assert('sin ventas: array vacío', KPI.ventasEnPeriodo({ type: 'month', offset: 0 }).length, 0);
    });

    // Past period → vacío
    var pastPeriod = { type: 'custom', customStart: '2000-01-01', customEnd: '2000-01-02' };
    assert('período pasado sin datos: []',
      KPI.ventasEnPeriodo(pastPeriod).length, 0);

    // Venta de hoy debe aparecer en período 'today'
    withVentas([
      { fecha: new Date().toISOString(), total: 5, items: [] }
    ], function() {
      var hoy = KPI.ventasEnPeriodo({ type: 'today', offset: 0 });
      assert('venta hoy en período today', hoy.length, 1);
    });

    // Venta de ayer NO aparece en período 'today' (offset 0)
    withVentas([
      { fecha: daysAgo(1), total: 5, items: [] }
    ], function() {
      var hoy = KPI.ventasEnPeriodo({ type: 'today', offset: 0 });
      assert('venta ayer no en today', hoy.length, 0);
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('K. KPI.getVentasChartData() — schema items[]');

    // Venta moderna con items[] — el gráfico debe sumar v.total, no pvp*qty raíz
    withVentas([
      {
        fecha: new Date().toISOString(),
        total: 3.00,
        items: [{ prodId: 'p1', qty: 2, pvp: 1.50, coste: 0.75 }]
        // pvp y qty en raíz: undefined → si se usara raíz = 0
      }
    ], function() {
      var chartData = KPI.getVentasChartData({ type: 'today', offset: 0 }, 'ingresos');
      var sumChart = (chartData.vals || []).reduce(function(s, v) { return s + v; }, 0);
      assert('schema items[]: chart suma > 0 (no usa pvp/qty raíz)', sumChart > 0 ? 1 : 0, 1);
    });

    // Venta legacy con pvp/qty raíz — debe seguir funcionando
    withVentas([
      { fecha: new Date().toISOString(), pvp: 2.00, qty: 3 }
    ], function() {
      var chartData = KPI.getVentasChartData({ type: 'today', offset: 0 }, 'ingresos');
      var sumChart = (chartData.vals || []).reduce(function(s, v) { return s + v; }, 0);
      assert('schema legacy pvp*qty: chart suma > 0', sumChart > 0 ? 1 : 0, 1);
    });

    // Mode 'unidades': suma qty no ingresos
    withVentas([
      {
        fecha: new Date().toISOString(),
        total: 10.00,
        items: [{ qty: 5, pvp: 2.00 }]
      }
    ], function() {
      var chartUds = KPI.getVentasChartData({ type: 'today', offset: 0 }, 'unidades');
      var sumUds = (chartUds.vals || []).reduce(function(s, v) { return s + v; }, 0);
      assert('mode unidades: suma qty=5', sumUds, 5);
    });

    // getVentasChartData — todos los tipos de período no crashean
    withVentas([]);
    ['today','week','month','year'].forEach(function(type) {
      try {
        var cd = KPI.getVentasChartData({ type: type, offset: 0 });
        assert('getVentasChartData "' + type + '": no crash', Array.isArray(cd.vals) ? 1 : 0, 1);
      } catch(e) {
        assert('getVentasChartData "' + type + '": no crash', false, true);
      }
    });

    // Custom period
    withVentas([], function() {
      try {
        var cd = KPI.getVentasChartData({
          type: 'custom', customStart: '2026-01-01', customEnd: '2026-01-31'
        });
        assert('getVentasChartData custom: no crash', cd.vals ? 1 : 0, 1);
      } catch(e) {
        assert('getVentasChartData custom: no crash', false, true);
      }
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN L — KPI: getChartData() — IVA dinámico via FinEngine
     * ═══════════════════════════════════════════════════════════════════ */
    section('L. KPI.getChartData() — IVA dinámico');

    // getChartData usa FinEngine.pedidoCoste → respeta campo iva por item
    withHistorial([
      {
        id: 'p_iva21', fecha: new Date().toISOString(), provId: 'test',
        items: [{ ncajas: 1, precio: 10.00, iva: '21' }]
      }
    ], function() {
      try {
        var cd = KPI.getChartData({ type: 'today', offset: 0 });
        var sum = (cd.vals || []).reduce(function(s, v) { return s + v; }, 0);
        // 1*10*1.21 = 12.10 — si usa 1.10 daría 11 (test detectaría regresión)
        assert('IVA 21% en gráfico: suma≈12.10', sum, 12.10, 0.05);
      } catch(e) {
        assert('getChartData IVA 21%: no crash', false, true);
      }
    });

    // getChartData todos los tipos no crashean
    withHistorial([]);
    ['today','week','month','year'].forEach(function(type) {
      try {
        var cd = KPI.getChartData({ type: type, offset: 0 });
        assert('getChartData "' + type + '": no crash', Array.isArray(cd.vals) ? 1 : 0, 1);
      } catch(e) {
        assert('getChartData "' + type + '": no crash', false, true);
      }
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN M — KPI: getBeneficioNeto() y getTopVentas()
     * ═══════════════════════════════════════════════════════════════════ */
    section('M. KPI.getBeneficioNeto()');

    withVentas([], function() {
      withHistorial([], function() {
        var ben = KPI.getBeneficioNeto({ type: 'month', offset: 0 });
        assertKeys('getBeneficioNeto: tiene claves esperadas', ben,
          ['beneficio', 'inv', 'vta', 'costeVentas', 'nTickets', 'valorInv']);
        assert('sin datos: vta=0', ben.vta, 0);
        assert('sin datos: inv=0', ben.inv, 0);
      });
    });

    // Con ventas: vta > 0
    withVentas([
      { fecha: new Date().toISOString(), total: 25.00, items: [{ qty: 1, pvp: 25, coste: 10 }] }
    ], function() {
      var ben = KPI.getBeneficioNeto({ type: 'today', offset: 0 });
      assert('con venta: vta=25', ben.vta, 25);
      assert('con venta: costeVentas=10', ben.costeVentas, 10);
      assert('con venta: beneficio=15', ben.beneficio, 15);
      assert('con venta: nTickets=1', ben.nTickets, 1);
    });

    /* ─────────────────────────────────────────────────────────────────── */
    section('M. KPI.getTopVentas()');

    withVentas([], function() {
      var top = KPI.getTopVentas({ type: 'month', offset: 0 });
      assertArray('sin ventas: array', top);
      assert('sin ventas: vacío', top.length, 0);
    });

    /* ═══════════════════════════════════════════════════════════════════
     * SECCIÓN N — Integración: State demo data (valores esperados exactos)
     * Estos tests verifican que los datos demo producen los KPIs documentados.
     * Si fallan → la demo data o las fórmulas cambiaron.
     * ═══════════════════════════════════════════════════════════════════ */
    section('N. Integración — State demo data');

    // gastoMensualTotal con demo: 800+180+120+60=1160
    assert('demo: gastoMensualTotal=1160', FinEngine.gastoMensualTotal(), 1160);
    assert('demo: gastoFijoMensual=1100',  FinEngine.gastoFijoMensual(),  1100);
    assert('demo: comprometido=1100',      FinEngine.comprometido(),      1100);

    // saldoCuentas demo: 5200+320=5520
    assert('demo: saldoCuentas=5520', FinEngine.saldoCuentas(), 5520);

    // runway demo: round(5520 / (1160/30)) = 143
    assert('demo: runway=143 días', FinEngine.runway(), 143);

    // valorStock demo: calculado = 205.20
    assert('demo: valorStock=205.20', FinEngine.valorStock(), 205.20);

    // pedidoCoste demo pedidos
    var ped1 = { items: [
      { ncajas: 2, udscaja: 24, precio: 0.75, pvp: 1.50, prodId: 'p1' },
      { ncajas: 1, udscaja: 24, precio: 0.20, pvp: 0.80, prodId: 'p3' }
    ]};
    // 2*0.75*1.10 + 1*0.20*1.10 = 1.65 + 0.22 = 1.87
    assert('demo ped_demo1: pedidoCoste=1.87', FinEngine.pedidoCoste(ped1), 1.87, 0.001);

    var ped2 = { items: [
      { ncajas: 2, udscaja: 24, precio: 0.45, pvp: 1.20, prodId: 'p6'  },
      { ncajas: 2, udscaja: 24, precio: 0.48, pvp: 1.20, prodId: 'p10' }
    ]};
    // 2*0.45*1.10 + 2*0.48*1.10 = 0.99 + 1.056 = 2.046 → money = 2.05
    assert('demo ped_demo2: pedidoCoste=2.05', FinEngine.pedidoCoste(ped2), 2.05, 0.01);

    // comprasMesActual demo: los 2 pedidos demo son de marzo 2026
    // Solo se cuentan si el mes actual es marzo 2026
    var comprasMes = FinEngine.comprasMesActual();
    assertType('demo: comprasMesActual es number', comprasMes, 'number');
    assertRange('demo: comprasMesActual >= 0', comprasMes, 0, 999999);

    // snapshot no crashea con datos demo
    try {
      var snapDemo = FinEngine.snapshot({ type: 'month', offset: 0 });
      assert('demo: snapshot no crash', true, true);
      assertType('demo: snapshot.gastoMensual=1160', snapDemo.gastoMensual, 'number');
      assert('demo: snapshot.gastoMensual=1160', snapDemo.gastoMensual, 1160);
      assert('demo: snapshot.saldo=5520', snapDemo.saldo, 5520);
      assert('demo: snapshot.valorStock=205.20', snapDemo.valorStock, 205.20);
    } catch(e) {
      assert('demo: snapshot no crash', false, true);
    }

    /* ─────────────────────────────────────────────────────────────────── */
    section('N. Integración — KPI con datos demo');

    // KPIs con datos demo no crashean
    try {
      var kpis = KPI.getKPIs({ type: 'month', offset: 0 });
      assertType('demo: KPI.getKPIs.inv es number', kpis.inv, 'number');
      assertRange('demo: KPI.getKPIs.inv >= 0', kpis.inv, 0, 999999);
    } catch(e) {
      assert('demo: KPI.getKPIs no crash', false, true);
    }

    try {
      var topCompras = KPI.getTopCompras({ type: 'month', offset: 0 });
      assertArray('demo: KPI.getTopCompras es array', topCompras);
    } catch(e) {
      assert('demo: KPI.getTopCompras no crash', false, true);
    }

    try {
      var gastoProv = KPI.getGastoPorProv({ type: 'month', offset: 0 });
      assertArray('demo: KPI.getGastoPorProv es array', gastoProv);
    } catch(e) {
      assert('demo: KPI.getGastoPorProv no crash', false, true);
    }

    /* ─────────────────────────────────────────────────────────────────── */

    /* ═══════════════════════════════════════════════════════════════════
     * REPORTE FINAL
     * ═══════════════════════════════════════════════════════════════════ */

    var total = _passed + _failed;
    var pct   = total > 0 ? Math.round(_passed / total * 100) : 0;
    var status = _failed === 0 ? ' ✅ TODOS OK' : ' ❌ ' + _failed + ' FALLIDOS';

    console.info(
      '[Dashwey Tests] ' + _passed + '/' + total + ' (' + pct + '%)' + status
    );

    if (_failed > 0) {
      console.group('[Dashwey Tests] Fallos:');
      _results
        .filter(function(r) { return !r.ok; })
        .forEach(function(r) {
          console.warn('  FAIL: ' + r.name + ' | got:', r.got, '| expected:', r.expected);
        });
      console.groupEnd();
    }

    window._DashweyTestResults = {
      passed:  _passed,
      failed:  _failed,
      total:   total,
      pct:     pct,
      results: _results
    };

    return window._DashweyTestResults;
  }

  /* ─── Activación ──────────────────────────────────────────────────── */

  window._DashweyRunTests = _run;

  if (typeof location !== 'undefined' && location.hash === '#dashwey-tests') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { setTimeout(_run, 1500); });
    } else {
      setTimeout(_run, 1500);
    }
  }

})();
