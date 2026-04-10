const express = require('express');
const router = express.Router();
const { getDb, run, all, get, lastId } = require('../db/database');

router.use(async (req, res, next) => {
  try { await getDb(); next(); } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── GASTOS FIJOS (PLANTILLAS) ────────────────────────────────
router.get('/gastos-fijos', (req, res) => {
  const items = all(`
    SELECT gf.*, c.nombre as categoria_nombre, c.icono as categoria_icono, c.color as categoria_color,
           cu.nombre as cuenta_nombre, t.nombre as tarjeta_nombre
    FROM gastos_fijos gf
    LEFT JOIN categorias c ON gf.categoria_id = c.id
    LEFT JOIN cuentas cu ON gf.cuenta_id = cu.id
    LEFT JOIN tarjetas t ON gf.tarjeta_id = t.id
    WHERE gf.activo = 1
    ORDER BY gf.nombre
  `);
  res.json(items);
});

router.post('/gastos-fijos', (req, res) => {
  const { nombre, monto, categoria_id, cuenta_id, tarjeta_id } = req.body;
  const montoNum = monto ? parseFloat(monto) : 0;
  run('INSERT INTO gastos_fijos (nombre, monto, categoria_id, cuenta_id, tarjeta_id) VALUES (?,?,?,?,?)',
    [nombre, montoNum, categoria_id || null, cuenta_id || null, tarjeta_id || null]);
  res.json({ id: lastId('gastos_fijos'), ...req.body });
});

router.put('/gastos-fijos/:id', (req, res) => {
  const { nombre, monto, categoria_id, cuenta_id, tarjeta_id, activo } = req.body;
  const montoNum = monto ? parseFloat(monto) : 0;
  run('UPDATE gastos_fijos SET nombre=?, monto=?, categoria_id=?, cuenta_id=?, tarjeta_id=?, activo=? WHERE id=?',
    [nombre, montoNum, categoria_id || null, cuenta_id || null, tarjeta_id || null, activo ?? 1, req.params.id]);
  res.json({ ok: true });
});

router.delete('/gastos-fijos/:id', (req, res) => {
  run('DELETE FROM gastos_fijos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ─── GASTOS FIJOS MENSUALES ───────────────────────────────────
router.get('/gastos-fijos-mensuales', (req, res) => {
  const { anio, mes } = req.query;
  const items = all(`
    SELECT gfm.*, 
           COALESCE(gfm.nombre, gf.nombre) as nombre, 
           COALESCE(gfm.categoria_id, gf.categoria_id) as categoria_id, 
           COALESCE(gfm.cuenta_id, gf.cuenta_id) as cuenta_id, 
           COALESCE(gfm.tarjeta_id, gf.tarjeta_id) as tarjeta_id,
           c.nombre as categoria_nombre, c.icono as categoria_icono, c.color as categoria_color,
           cu.nombre as cuenta_nombre, t.nombre as tarjeta_nombre
    FROM gastos_fijos_mensuales gfm
    LEFT JOIN gastos_fijos gf ON gfm.gasto_fijo_id = gf.id
    LEFT JOIN categorias c ON COALESCE(gfm.categoria_id, gf.categoria_id) = c.id
    LEFT JOIN cuentas cu ON COALESCE(gfm.cuenta_id, gf.cuenta_id) = cu.id
    LEFT JOIN tarjetas t ON COALESCE(gfm.tarjeta_id, gf.tarjeta_id) = t.id
    WHERE gfm.anio = ? AND gfm.mes = ?
    ORDER BY COALESCE(gfm.nombre, gf.nombre)
  `, [parseInt(anio), parseInt(mes)]);
  res.json(items);
});

router.post('/gastos-fijos-mensuales/cargar', (req, res) => {
  const { anio, mes, plantillas_ids } = req.body;
  if (!plantillas_ids || !Array.isArray(plantillas_ids) || plantillas_ids.length === 0) {
    return res.json({ ok: true, cargados: 0 });
  }

  const inClause = plantillas_ids.map(() => '?').join(',');
  const plantillas = all(`SELECT * FROM gastos_fijos WHERE id IN (${inClause}) AND activo = 1`, plantillas_ids);
  
  for (const p of plantillas) {
    try {
      run('INSERT OR IGNORE INTO gastos_fijos_mensuales (gasto_fijo_id, anio, mes, monto) VALUES (?,?,?,?)',
        [p.id, parseInt(anio), parseInt(mes), p.monto || 0]);
    } catch(e) { /* UNIQUE conflict, skip */ }
  }
  res.json({ ok: true, cargados: plantillas.length });
});

router.post('/gastos-fijos-mensuales/puntual', (req, res) => {
  const { nombre, monto, categoria_id, cuenta_id, tarjeta_id, anio, mes } = req.body;
  const montoNum = monto ? parseFloat(monto) : 0;
  
  run(`INSERT INTO gastos_fijos_mensuales 
       (nombre, monto, categoria_id, cuenta_id, tarjeta_id, anio, mes) 
       VALUES (?,?,?,?,?,?,?)`,
    [nombre, montoNum, categoria_id || null, cuenta_id || null, tarjeta_id || null, parseInt(anio), parseInt(mes)]);
    
  res.json({ ok: true, id: lastId('gastos_fijos_mensuales') });
});

router.put('/gastos-fijos-mensuales/:id', (req, res) => {
  const { monto, pagado, nombre, categoria_id, cuenta_id, tarjeta_id } = req.body;
  const existing = get('SELECT * FROM gastos_fijos_mensuales WHERE id=?', [req.params.id]);
  if (!existing) return res.status(404).json({error: 'Not found'});
  
  let sql = 'UPDATE gastos_fijos_mensuales SET ';
  let params = [];
  let sets = [];
  
  if (monto !== undefined) { sets.push('monto=?'); params.push(parseFloat(monto)); }
  if (pagado !== undefined) { sets.push('pagado=?'); params.push(pagado ? 1 : 0); }
  if (nombre !== undefined) { sets.push('nombre=?'); params.push(nombre); }
  if (categoria_id !== undefined) { sets.push('categoria_id=?'); params.push(categoria_id || null); }
  if (cuenta_id !== undefined) { sets.push('cuenta_id=?'); params.push(cuenta_id || null); }
  if (tarjeta_id !== undefined) { sets.push('tarjeta_id=?'); params.push(tarjeta_id || null); }
  
  if (sets.length === 0) return res.json({ok: true});
  
  params.push(req.params.id);
  run(sql + sets.join(', ') + ' WHERE id=?', params);
  
  res.json({ ok: true });
});

router.delete('/gastos-fijos-mensuales/:id', (req, res) => {
  run('DELETE FROM gastos_fijos_mensuales WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ─── TRANSACCIONES ────────────────────────────────────────────
router.get('/transacciones', (req, res) => {
  const { anio, mes, cuenta_id, tarjeta_id } = req.query;
  let where = ['1=1'];
  let params = [];

  if (anio && mes) {
    where.push(`strftime('%Y', t.fecha) = ? AND strftime('%m', t.fecha) = ?`);
    params.push(String(anio), String(mes).padStart(2, '0'));
  }
  if (cuenta_id) { where.push('t.cuenta_id = ?'); params.push(cuenta_id); }
  if (tarjeta_id) { where.push('t.tarjeta_id = ?'); params.push(tarjeta_id); }

  const items = all(`
    SELECT t.*, c.nombre as categoria_nombre, c.icono as categoria_icono, c.color as categoria_color,
           cu.nombre as cuenta_nombre, ta.nombre as tarjeta_nombre
    FROM transacciones t
    LEFT JOIN categorias c ON t.categoria_id = c.id
    LEFT JOIN cuentas cu ON t.cuenta_id = cu.id
    LEFT JOIN tarjetas ta ON t.tarjeta_id = ta.id
    WHERE ${where.join(' AND ')}
    ORDER BY t.fecha DESC, t.created_at DESC
  `, params);
  res.json(items);
});

router.post('/transacciones', (req, res) => {
  const {
    descripcion, monto, categoria_id, cuenta_id, tarjeta_id,
    cuotas, mes_primera_cuota, anio_primera_cuota, fecha, tipo
  } = req.body;

  const montoNum = parseFloat(monto);
  const cuotasNum = parseInt(cuotas) || 1;
  const fechaVal = fecha || new Date().toISOString().split('T')[0];
  const tipoVal = tipo || 'gasto';

  run(`INSERT INTO transacciones
    (descripcion, monto, categoria_id, cuenta_id, tarjeta_id, cuotas, mes_primera_cuota, anio_primera_cuota, fecha, tipo)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [descripcion, montoNum, categoria_id || null, cuenta_id || null, tarjeta_id || null,
     cuotasNum, mes_primera_cuota || null, anio_primera_cuota || null, fechaVal, tipoVal]);

  const id = lastId('transacciones');

  // Actualizar saldo de cuenta
  if (cuenta_id) {
    const delta = tipoVal === 'ingreso' ? montoNum : -montoNum;
    run('UPDATE cuentas SET saldo = saldo + ? WHERE id=?', [delta, cuenta_id]);
    run('INSERT INTO movimientos_cuenta (cuenta_id, monto, descripcion, tipo, fecha) VALUES (?,?,?,?,?)',
      [cuenta_id, montoNum, descripcion, tipoVal === 'ingreso' ? 'ingreso' : 'egreso', fechaVal]);
  }

  res.json({ id, ok: true });
});

router.put('/transacciones/:id', (req, res) => {
  const { descripcion, monto, categoria_id, fecha } = req.body;
  run('UPDATE transacciones SET descripcion=?, monto=?, categoria_id=?, fecha=? WHERE id=?',
    [descripcion, parseFloat(monto), categoria_id || null, fecha, req.params.id]);
  res.json({ ok: true });
});

router.delete('/transacciones/:id', (req, res) => {
  const t = get('SELECT * FROM transacciones WHERE id=?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'No encontrado' });

  if (t.cuenta_id) {
    const delta = t.tipo === 'gasto' ? t.monto : -t.monto;
    run('UPDATE cuentas SET saldo = saldo + ? WHERE id=?', [delta, t.cuenta_id]);
  }
  run('DELETE FROM transacciones WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ─── RESUMEN MENSUAL ──────────────────────────────────────────
router.get('/resumen', (req, res) => {
  const { anio, mes } = req.query;
  const anioN = parseInt(anio);
  const mesN = parseInt(mes);
  const mesStr = String(mesN).padStart(2, '0');
  const anioStr = String(anioN);

  const gastosDiarios = get(
    `SELECT COALESCE(SUM(monto), 0) as total FROM transacciones
     WHERE tipo = 'gasto' AND strftime('%Y', fecha) = ? AND strftime('%m', fecha) = ?`,
    [anioStr, mesStr]
  );
  const ingresosDiarios = get(
    `SELECT COALESCE(SUM(monto), 0) as total FROM transacciones
     WHERE tipo = 'ingreso' AND strftime('%Y', fecha) = ? AND strftime('%m', fecha) = ?`,
    [anioStr, mesStr]
  );
  const gastosFijos = get(
    `SELECT COALESCE(SUM(monto), 0) as total FROM gastos_fijos_mensuales WHERE anio = ? AND mes = ?`,
    [anioN, mesN]
  );

  // Cuotas activas este mes por tarjeta
  const todasTransTarjeta = all(
    `SELECT t.*, ta.id as tid, ta.nombre as tnombre, ta.color as tcolor, ta.icono as ticono
     FROM transacciones t
     JOIN tarjetas ta ON t.tarjeta_id = ta.id
     WHERE t.tarjeta_id IS NOT NULL AND t.tipo = 'gasto'`
  );

  const cuotasPorTarjeta = {};
  for (const t of todasTransTarjeta) {
    if (!t.anio_primera_cuota) {
      // Sin fecha de primera cuota: no sabemos, omitir
      continue;
    }
    const ini = t.anio_primera_cuota * 12 + (t.mes_primera_cuota - 1);
    const fin = ini + (t.cuotas || 1) - 1;
    const actual = anioN * 12 + (mesN - 1);
    if (actual >= ini && actual <= fin) {
      if (!cuotasPorTarjeta[t.tid]) {
        cuotasPorTarjeta[t.tid] = { id: t.tid, nombre: t.tnombre, color: t.tcolor, icono: t.ticono, total_mes: 0 };
      }
      cuotasPorTarjeta[t.tid].total_mes += t.monto / (t.cuotas || 1);
    }
  }

  const porCategoria = all(
    `SELECT c.nombre, c.icono, c.color, SUM(t.monto) as total
     FROM transacciones t
     LEFT JOIN categorias c ON t.categoria_id = c.id
     WHERE t.tipo = 'gasto' AND strftime('%Y', t.fecha) = ? AND strftime('%m', t.fecha) = ?
     GROUP BY t.categoria_id ORDER BY total DESC LIMIT 8`,
    [anioStr, mesStr]
  );

  res.json({
    gastos_diarios: gastosDiarios?.total || 0,
    ingresos: ingresosDiarios?.total || 0,
    gastos_fijos: gastosFijos?.total || 0,
    cuotas_tarjeta: Object.values(cuotasPorTarjeta),
    por_categoria: porCategoria,
  });
});

module.exports = router;
