// Configuración y lógica del cliente para Web Push Notifications

let vapidPublicKey = null;

// Registrar el Service Worker automáticamente al cargar si está soportado
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('/sw.js')
    .then(swReg => {
      console.log('✅ Service Worker registrado para notificaciones');
    })
    .catch(error => {
      console.error('Error Registrando Service Worker', error);
    });
}

// Convertir Public Key a Uint8Array
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Interfaz para suscribir
document.getElementById('pushToggle').addEventListener('click', abrirModalSuscripcion);

function abrirModalSuscripcion() {
  const guardado = localStorage.getItem('usuario_push') || '';
  
  const posibles = ['joni', 'nacho', 'vicky', 'fher'];
  const selectHtml = posibles.map(p => 
    `<option value="${p}" ${guardado === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  const html = `
    <div style="text-align: center; padding: 10px 0;">
      <p style="font-size: 0.9rem; color: var(--text2); margin-bottom: 20px;">
        Para recibir alertas de tareas cuando no estés conectado, dinos quién usa este dispositivo:
      </p>
      
      <div class="form-group" style="text-align: left;">
        <label class="form-label">Mi Identidad</label>
        <select id="pushUserSelect">
          <option value="">-- Elige quién eres --</option>
          ${selectHtml}
        </select>
      </div>

      <button class="btn btn-primary" style="margin-top: 10px; width: 100%; justify-content: center;" onclick="activarNotificaciones()">
        Activar Notificaciones en este dispositivo
      </button>

      <p style="font-size:0.75rem; color: var(--text3); margin-top:20px;">
        * Tu navegador te pedirá permiso para enviarte alertas.
      </p>
    </div>
  `;

  openModal('🔔 Configurar Equipo', html);
}

async function activarNotificaciones() {
  const user = document.getElementById('pushUserSelect').value;
  if (!user) return toast('Selecciona quién eres', 'error');

  if (!('serviceWorker' in navigator && 'PushManager' in window)) {
    return toast('El navegador no soporta notificaciones', 'error');
  }

  try {
    // Pedir permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return toast('Permiso denegado', 'error');
    }

    // Obtener llave publica
    if (!vapidPublicKey) {
      const resVapid = await API.get('/push/vapid');
      vapidPublicKey = resVapid.publicKey;
    }

    // Generar suscripción
    const swReg = await navigator.serviceWorker.ready;
    const applicationServerKey = urlB64ToUint8Array(vapidPublicKey);
    
    // Si ya existe borrala y vuelve a crearla
    let subscription = await swReg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    // Enviar a nuestro backend
    const res = await API.post('/push/suscribir', {
      usuario: user,
      subscription: subscription
    });

    if (res.ok) {
      localStorage.setItem('usuario_push', user);
      toast('¡Notificaciones activadas exitosamente!');
      closeModal();
    }

  } catch (error) {
    console.error('Push Error:', error);
    toast('Error vinculando: ' + error.message, 'error');
  }
}
