const cron = require('node-cron');
const { getDb, all } = require('./db/database');
const { webpush } = require('./routes/push');

// Ejecutar todos los días a las 08:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Ejecutando cron de notificaciones push de limpieza...');
  try {
    await getDb(); // Asegurar conexión
    
    // Conseguir fecha de hoy local 'YYYY-MM-DD'
    const today = new Date().toISOString().split('T')[0];
    
    const asignaciones = all(`
      SELECT a.*, t.nombre as tarea_nombre
      FROM tareas_asignadas a
      JOIN tareas_limpieza t ON a.tarea_id = t.id
      WHERE a.fecha = ? AND a.completado = 0
    `, [today]);

    if (asignaciones.length === 0) {
      console.log('No hay tareas de limpieza pendientes para hoy.');
      return;
    }

    for (const a of asignaciones) {
      const persona = a.persona_asignada;
      if (!persona || persona === "Nadie") continue;

      const suscripciones = all('SELECT * FROM suscripciones_push WHERE usuario = ?', [persona]);
      
      for (const sub of suscripciones) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };

        const payload = JSON.stringify({
          title: 'Tareas del Hogar 🧹',
          body: `¡Hola ${persona}! Hoy te toca: ${a.tarea_nombre}.`,
          icon: '/icon-192.png',
          url: '/#limpieza' // Podemos redirigir al abrir
        });

        webpush.sendNotification(pushSubscription, payload).catch(err => {
          console.error(`Error enviando push a ${persona}:`, err.message);
        });
      }
    }
  } catch(e) {
    console.error('Error en el cron:', e);
  }
});

console.log('✅ Cronjob de Notificaciones programado para las 08:00 AM.');
