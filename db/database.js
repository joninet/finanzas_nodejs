const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'gastos.db');

let db = null;
let SQL = null;

async function initSql() {
  if (SQL) return;
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function getDb() {
  if (db) return db;
  await initSql();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initSchema();
  return db;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (e) {
    console.error('SQL error:', e.message, '\nSQL:', sql);
    throw e;
  }
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

function lastId(table) {
  if (!table) return null;
  return get(`SELECT MAX(id) as id FROM ${table}`)?.id || null;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      icono TEXT DEFAULT '📦',
      color TEXT DEFAULT '#6366f1',
      parent_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS cuentas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'efectivo',
      saldo REAL DEFAULT 0,
      moneda TEXT DEFAULT 'ARS',
      color TEXT DEFAULT '#10b981',
      icono TEXT DEFAULT '🏦',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tarjetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      banco TEXT,
      limite REAL DEFAULT 0,
      color TEXT DEFAULT '#f59e0b',
      icono TEXT DEFAULT '💳',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS gastos_fijos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      monto REAL NOT NULL,
      categoria_id INTEGER,
      cuenta_id INTEGER,
      tarjeta_id INTEGER,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  const checkV2 = get("SELECT name FROM sqlite_master WHERE type='table' AND name='gastos_fijos_mensuales'");
  let isV1 = false;
  if (checkV2) {
    const tableInfo = all("PRAGMA table_info(gastos_fijos_mensuales)");
    isV1 = !tableInfo.some(col => col.name === 'nombre');
  }

  if (isV1) {
    db.run(`
      CREATE TABLE gastos_fijos_mensuales_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gasto_fijo_id INTEGER,
        nombre TEXT,
        categoria_id INTEGER,
        cuenta_id INTEGER,
        tarjeta_id INTEGER,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        monto REAL NOT NULL,
        pagado INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.run(`
      INSERT INTO gastos_fijos_mensuales_v2 (id, gasto_fijo_id, anio, mes, monto, pagado, created_at)
      SELECT id, gasto_fijo_id, anio, mes, monto, pagado, created_at FROM gastos_fijos_mensuales
    `);
    db.run(`DROP TABLE gastos_fijos_mensuales`);
    db.run(`ALTER TABLE gastos_fijos_mensuales_v2 RENAME TO gastos_fijos_mensuales`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_gfm_unique ON gastos_fijos_mensuales (gasto_fijo_id, anio, mes)`);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS gastos_fijos_mensuales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gasto_fijo_id INTEGER,
        nombre TEXT,
        categoria_id INTEGER,
        cuenta_id INTEGER,
        tarjeta_id INTEGER,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        monto REAL NOT NULL,
        pagado INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_gfm_unique ON gastos_fijos_mensuales (gasto_fijo_id, anio, mes)`);
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT NOT NULL,
      monto REAL NOT NULL,
      categoria_id INTEGER,
      cuenta_id INTEGER,
      tarjeta_id INTEGER,
      cuotas INTEGER DEFAULT 1,
      mes_primera_cuota INTEGER,
      anio_primera_cuota INTEGER,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      tipo TEXT DEFAULT 'gasto',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS movimientos_cuenta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cuenta_id INTEGER NOT NULL,
      monto REAL NOT NULL,
      descripcion TEXT,
      tipo TEXT NOT NULL,
      fecha TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tareas_limpieza (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dia_semana INTEGER NOT NULL,
      encargados_posibles TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tareas_asignadas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarea_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      persona_asignada TEXT NOT NULL,
      completado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS suscripciones_push (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed categorías
  const count = get('SELECT COUNT(*) as n FROM categorias');
  if (!count || count.n === 0) {
    const cats = [
      ['Vivienda','🏠','#6366f1'],
      ['Servicios','⚡','#f59e0b'],
      ['Educación','📚','#10b981'],
      ['Alimentación','🛒','#ef4444'],
      ['Transporte','🚗','#3b82f6'],
      ['Salud','🏥','#ec4899'],
      ['Entretenimiento','🎬','#8b5cf6'],
      ['Ropa','👕','#14b8a6'],
      ['Otros','📦','#6b7280'],
    ];
    for (const [n,i,c] of cats) {
      db.run('INSERT INTO categorias (nombre, icono, color) VALUES (?,?,?)', [n,i,c]);
    }
    const pid = (nombre) => get('SELECT id FROM categorias WHERE nombre = ?', [nombre])?.id;
    const subs = [
      ['Alquiler','🏠','#6366f1','Vivienda'],
      ['Expensas','🏢','#6366f1','Vivienda'],
      ['Electricidad','💡','#f59e0b','Servicios'],
      ['Gas','🔥','#f59e0b','Servicios'],
      ['Internet','📡','#f59e0b','Servicios'],
      ['Agua','💧','#f59e0b','Servicios'],
      ['Colegio','🎒','#10b981','Educación'],
      ['Supermercado','🛒','#ef4444','Alimentación'],
      ['Restaurante','🍽️','#ef4444','Alimentación'],
      ['Nafta','⛽','#3b82f6','Transporte'],
    ];
    for (const [n,i,c,p] of subs) {
      const parentId = pid(p);
      if (parentId) db.run('INSERT INTO categorias (nombre, icono, color, parent_id) VALUES (?,?,?,?)', [n,i,c,parentId]);
    }
    saveDb();
  }
}

module.exports = { getDb, run, all, get, lastId, saveDb };
