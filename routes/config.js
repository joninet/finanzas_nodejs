const express = require('express');
const router = express.Router();
const { getDb, run, all, get, lastId } = require('../db/database');

// Middleware: ensure DB is ready
router.use(async (req, res, next) => {
  try { await getDb(); next(); } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── CATEGORÍAS ───────────────────────────────────────────────
router.get('/categorias', (req, res) => {
  const cats = all(`
    SELECT c.*, p.nombre as parent_nombre
    FROM categorias c
    LEFT JOIN categorias p ON c.parent_id = p.id
    ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.nombre
  `);
  res.json(cats);
});

router.post('/categorias', (req, res) => {
  const { nombre, icono, color, parent_id } = req.body;
  run('INSERT INTO categorias (nombre, icono, color, parent_id) VALUES (?, ?, ?, ?)',
    [nombre, icono || '📦', color || '#6366f1', parent_id || null]);
  res.json({ id: lastId('categorias'), nombre, icono, color, parent_id });
});

router.put('/categorias/:id', (req, res) => {
  const { nombre, icono, color, parent_id } = req.body;
  run('UPDATE categorias SET nombre=?, icono=?, color=?, parent_id=? WHERE id=?',
    [nombre, icono, color, parent_id || null, req.params.id]);
  res.json({ ok: true });
});

router.delete('/categorias/:id', (req, res) => {
  run('DELETE FROM categorias WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// ─── CUENTAS ──────────────────────────────────────────────────
router.get('/cuentas', (req, res) => {
  res.json(all('SELECT * FROM cuentas ORDER BY nombre'));
});

router.post('/cuentas', (req, res) => {
  const { nombre, tipo, saldo, moneda, color, icono } = req.body;
  run('INSERT INTO cuentas (nombre, tipo, saldo, moneda, color, icono) VALUES (?,?,?,?,?,?)',
    [nombre, tipo || 'efectivo', parseFloat(saldo) || 0, moneda || 'ARS', color || '#10b981', icono || '🏦']);
  res.json({ id: lastId('cuentas'), ...req.body });
});

router.put('/cuentas/:id', (req, res) => {
  const { nombre, tipo, moneda, color, icono } = req.body;
  run('UPDATE cuentas SET nombre=?, tipo=?, moneda=?, color=?, icono=? WHERE id=?',
    [nombre, tipo, moneda, color, icono, req.params.id]);
  res.json({ ok: true });
});

router.delete('/cuentas/:id', (req, res) => {
  run('DELETE FROM cuentas WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

router.post('/cuentas/:id/movimiento', (req, res) => {
  const { monto, descripcion, tipo, fecha } = req.body;
  const m = parseFloat(monto);
  const fechaVal = fecha || new Date().toISOString().split('T')[0];
  run('INSERT INTO movimientos_cuenta (cuenta_id, monto, descripcion, tipo, fecha) VALUES (?,?,?,?,?)',
    [req.params.id, m, descripcion || '', tipo, fechaVal]);
  const delta = tipo === 'ingreso' ? m : -m;
  run('UPDATE cuentas SET saldo = saldo + ? WHERE id=?', [delta, req.params.id]);
  res.json(get('SELECT * FROM cuentas WHERE id=?', [req.params.id]));
});

router.get('/cuentas/:id/movimientos', (req, res) => {
  res.json(all('SELECT * FROM movimientos_cuenta WHERE cuenta_id=? ORDER BY fecha DESC LIMIT 50', [req.params.id]));
});

// ─── TARJETAS ─────────────────────────────────────────────────
router.get('/tarjetas', (req, res) => {
  res.json(all('SELECT * FROM tarjetas ORDER BY nombre'));
});

router.post('/tarjetas', (req, res) => {
  const { nombre, banco, limite, color, icono } = req.body;
  run('INSERT INTO tarjetas (nombre, banco, limite, color, icono) VALUES (?,?,?,?,?)',
    [nombre, banco || '', parseFloat(limite) || 0, color || '#f59e0b', icono || '💳']);
  res.json({ id: lastId('tarjetas'), ...req.body });
});

router.put('/tarjetas/:id', (req, res) => {
  const { nombre, banco, limite, color, icono } = req.body;
  run('UPDATE tarjetas SET nombre=?, banco=?, limite=?, color=?, icono=? WHERE id=?',
    [nombre, banco, parseFloat(limite) || 0, color, icono, req.params.id]);
  res.json({ ok: true });
});

router.delete('/tarjetas/:id', (req, res) => {
  run('DELETE FROM tarjetas WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
