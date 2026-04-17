const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { getDb, run } = require('../db/database');

// Configuración requerida por web-push (usará el correo como contacto en caso de fallos)
webpush.setVapidDetails(
  'mailto:ejemplo@finanzas.local',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

router.use(async (req, res, next) => {
  try { await getDb(); next(); } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/push/vapid', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/push/suscribir', (req, res) => {
  const { usuario, subscription } = req.body;
  if (!usuario || !subscription) return res.status(400).json({ error: 'Datos insuficientes' });

  // Guardar/Actualizar en base de datos.
  // Borramos suscripción previa del mismo endpoint para evitar duplicados del mismo nav
  run('DELETE FROM suscripciones_push WHERE endpoint = ?', [subscription.endpoint]);

  run(`INSERT INTO suscripciones_push (usuario, endpoint, p256dh, auth) VALUES (?,?,?,?)`, [
    usuario,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth
  ]);

  res.json({ ok: true, message: 'Suscripción guardada exitosamente' });
});

module.exports = { pushRouter: router, webpush };
