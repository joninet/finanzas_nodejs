const express = require('express');
const router = express.Router();
const { getDb, run, all, get, lastId } = require('../db/database');

router.use(async (req, res, next) => {
  try { await getDb(); next(); } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── TAREAS DEFINICION ──────────────────────────────────────────
router.get('/limpieza/tareas', (req, res) => {
  const items = all('SELECT * FROM tareas_limpieza ORDER BY dia_semana, nombre');
  res.json(items);
});

router.post('/limpieza/tareas', (req, res) => {
  const { nombre, dia_semana, encargados_posibles, descripcion } = req.body;
  run('INSERT INTO tareas_limpieza (nombre, dia_semana, encargados_posibles, descripcion) VALUES (?, ?, ?, ?)',
    [nombre, dia_semana, encargados_posibles, descripcion || '']);
  res.json({ id: lastId('tareas_limpieza'), ok: true });
});

router.put('/limpieza/tareas/:id', (req, res) => {
  const { nombre, dia_semana, encargados_posibles, descripcion } = req.body;
  run('UPDATE tareas_limpieza SET nombre=?, dia_semana=?, encargados_posibles=?, descripcion=? WHERE id=?',
    [nombre, dia_semana, encargados_posibles, descripcion || '', req.params.id]);
  res.json({ ok: true });
});

router.delete('/limpieza/tareas/:id', (req, res) => {
  run('DELETE FROM tareas_limpieza WHERE id=?', [req.params.id]);
  // Borrar también las asignaciones futuras sería ideal, pero por ahora lo dejamos simple.
  run('DELETE FROM tareas_asignadas WHERE tarea_id=?', [req.params.id]);
  res.json({ ok: true });
});

// ─── ASIGNACIONES ───────────────────────────────────────────────
router.get('/limpieza/asignaciones', (req, res) => {
  const { inicio, fin } = req.query; // 'YYYY-MM-DD'
  // Si no se envían, devolvemos todo (para simplificar si fallara)
  let where = '1=1';
  let params = [];
  if (inicio && fin) {
    where = 'fecha >= ? AND fecha <= ?';
    params = [inicio, fin];
  }

  const items = all(`
    SELECT a.*, t.nombre as tarea_nombre, t.dia_semana, t.descripcion
    FROM tareas_asignadas a
    JOIN tareas_limpieza t ON a.tarea_id = t.id
    WHERE ${where}
    ORDER BY a.fecha, t.nombre
  `, params);
  res.json(items);
});

router.post('/limpieza/asignar-semana', (req, res) => {
  const { inicio } = req.body; // 'YYYY-MM-DD' Asumimos que inicio es LUNES o DOMINGO
  // Lo manejaremos considerando inicio como una fecha de base y dia_semana (0=Sun, 1=Mon...6=Sat)

  const tareas = all('SELECT * FROM tareas_limpieza');
  if (tareas.length === 0) {
    return res.json({ ok: true, generados: 0 });
  }

  // Parseamos inicio (usar UTC para evitar saltos de día por zona)
  const [y, m, d] = inicio.split('-').map(Number);
  const dateInicio = new Date(Date.UTC(y, m - 1, d)); // Ojo: si el JS lo asume domingo o lunes depende del front.
  
  // Borramos las que ya estén en esa semana para regenerar (es el comportamiento pedido de "generar la semana aleatoriamente")
  const tsInicio = dateInicio.getTime();
  const dateFin = new Date(tsInicio + 6 * 86400000);
  const inicioStr = dateInicio.toISOString().split('T')[0];
  const finStr = dateFin.toISOString().split('T')[0];

  run('DELETE FROM tareas_asignadas WHERE fecha >= ? AND fecha <= ?', [inicioStr, finStr]);

  let generados = 0;
  for (const t of tareas) {
    // Calculamos qué fecha le toca considerando el dia_semana guardado en la tarea
    // Suponemos que si el inicio es Dom (0) y dia_semana es Lunes (1), le sumamos 1 día al inicio.
    // O mejor: obligamos a que el front mande el 'inicio' como el comienzo de la semana
    // y dia_semana sea simplemente el offset en días (0 a 6).
    const fechaDestino = new Date(tsInicio + (t.dia_semana * 86400000));
    const fechaStr = fechaDestino.toISOString().split('T')[0];

    const encargados = t.encargados_posibles.split(',').map(e => e.trim()).filter(e => e);
    
    let elegido = "Nadie";
    if (encargados.length > 0) {
      elegido = encargados[Math.floor(Math.random() * encargados.length)];
    }

    run('INSERT INTO tareas_asignadas (tarea_id, fecha, persona_asignada, completado) VALUES (?,?,?,0)',
      [t.id, fechaStr, elegido]);
    generados++;
  }

  res.json({ ok: true, generados });
});

router.put('/limpieza/asignaciones/:id/toggle', (req, res) => {
  const { completado } = req.body;
  run('UPDATE tareas_asignadas SET completado=? WHERE id=?', [completado ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
