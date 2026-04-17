self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'Gastos App', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Notificación';
  const options = {
    body: data.body || 'Tienes un nuevo aviso de tareas familiares.',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      let matchingClient = null;
      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(urlToOpen)) {
          matchingClient = windowClient;
          break;
        }
      }
      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listener "fetch" obligatorio para que navegadores móviles como Brave y Chrome habiliten
// la instalación de la aplicación como PWA ("Añadir a pantalla de inicio").
self.addEventListener('fetch', function(event) {
  // Por ahora lo dejamos vacío para que siempre recoja los datos en vivo.
  // Es suficiente con declararlo explícitamente.
});

