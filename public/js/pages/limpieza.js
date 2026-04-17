// Estado local para limpieza
let limpiezaState = {
  inicioSemana: getInicioSemana(new Date()),
  tareasBase: [],
  asignaciones: []
};

function getInicioSemana(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Asumimos semana empieza en Domingo (0). 
  const diff = d.getDate() - day; 
  const sunday = new Date(d.setDate(diff));
  // Devolver YYYY-MM-DD local
  return `${sunday.getFullYear()}-${String(sunday.getMonth()+1).padStart(2,'0')}-${String(sunday.getDate()).padStart(2,'0')}`;
}

function strToDateUTC(str) {
  const [y,m,d] = str.split('-');
  return new Date(Date.UTC(y, m-1, d));
}

function formatFechaDia(str) {
  const [y,m,d] = str.split('-');
  const date = new Date(y, m-1, d); // Local time
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${dias[date.getDay()]} ${d}/${m}`;
}

async function renderLimpieza(anio, mes) {
  const container = document.getElementById('pageContent');
  
  // Limpiar vista y mostrar cargando
  container.innerHTML = `<div class="empty-state"><div class="empty-state-text">Cargando...</div></div>`;

  await loadLimpiezaData();

  // Calcular fin de semana
  const inicio = strToDateUTC(limpiezaState.inicioSemana);
  const fin = new Date(inicio.getTime() + 6 * 86400000);
  const finStr = `${fin.getUTCFullYear()}-${String(fin.getUTCMonth()+1).padStart(2,'0')}-${String(fin.getUTCDate()).padStart(2,'0')}`;

  const hasAsignaciones = limpiezaState.asignaciones.length > 0;

  let html = `
    <div class="card-header" style="margin-bottom: 20px;">
      <h2 class="card-title">Asignación Semanal</h2>
      <div>
        <button class="btn btn-ghost" onclick="abrirConfigTareas()">⚙️ Tareas Base</button>
      </div>
    </div>

    <!-- Navegación de Semanas -->
    <div class="month-picker" style="justify-content: center; width: max-content; margin: 0 auto 20px;">
      <button class="btn-month" onclick="navSemana(-1)">‹</button>
      <span id="semanaLabel" style="min-width: 150px; text-align:center; font-size: 0.9rem; font-weight: 600;">
        ${limpiezaState.inicioSemana} a ${finStr}
      </span>
      <button class="btn-month" onclick="navSemana(1)">›</button>
    </div>

    <div class="card">
  `;

  if (!hasAsignaciones) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">✨</div>
        <div class="empty-state-text" style="margin-bottom: 16px;">No hay tareas asignadas para esta semana.</div>
        <button class="btn btn-primary" onclick="generarSemana()">🎲 Generar Asignaciones</button>
      </div>
    `;
  } else {
    // Agrupar por fecha
    const porFecha = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicio.getTime() + i * 86400000);
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
        porFecha[k] = [];
    }

    limpiezaState.asignaciones.forEach(a => {
      if(porFecha[a.fecha]) porFecha[a.fecha].push(a);
    });

    html += `<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">`;
    for (const [fecha, tareas] of Object.entries(porFecha)) {
      html += `
        <div class="stat-card" style="padding: 12px;">
          <div class="stat-label" style="text-align: center; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-bottom: 10px;">
            ${formatFechaDia(fecha)}
          </div>
          <div class="item-list">
            ${tareas.length === 0 ? '<div style="text-align:center; color: var(--text3); font-size: 0.8rem;">Libre</div>' : ''}
            ${tareas.map(t => `
              <div class="item-row" style="padding: 8px;">
                <div class="item-icon" style="background: var(--bg4); width: 28px; height: 28px; font-size: 0.8rem;">
                  🧹
                </div>
                <div class="item-info">
                  <div class="item-name">${t.tarea_nombre}</div>
                  <div class="item-sub" style="font-weight: bold; color: var(--accent);">${t.persona_asignada}</div>
                </div>
                <div class="item-actions">
                  <input type="checkbox" ${t.completado ? 'checked' : ''} onchange="toggleCompletado(${t.id}, this.checked)" style="width: 16px; height: 16px;">
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    html += `</div>`;
    
    html += `
      <div style="text-align: right; margin-top: 16px;">
         <button class="btn btn-danger btn-sm" onclick="generarSemana()">🎲 Regenerar Semana</button>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

async function loadLimpiezaData() {
  const inicio = strToDateUTC(limpiezaState.inicioSemana);
  const fin = new Date(inicio.getTime() + 6 * 86400000);
  const finStr = `${fin.getUTCFullYear()}-${String(fin.getUTCMonth()+1).padStart(2,'0')}-${String(fin.getUTCDate()).padStart(2,'0')}`;

  const [resAsig, resTareas] = await Promise.all([
    API.get(`/limpieza/asignaciones?inicio=${limpiezaState.inicioSemana}&fin=${finStr}`),
    API.get('/limpieza/tareas')
  ]);
  
  limpiezaState.asignaciones = resAsig;
  limpiezaState.tareasBase = resTareas;
}

async function navSemana(dir) {
  const date = strToDateUTC(limpiezaState.inicioSemana);
  date.setUTCDate(date.getUTCDate() + (dir * 7));
  limpiezaState.inicioSemana = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  await renderLimpieza(window.AppState.anio, window.AppState.mes);
}

async function generarSemana() {
  if (limpiezaState.tareasBase.length === 0) {
    toast('Primero debes configurar tareas base', 'error');
    return;
  }
  
  try {
    const res = await API.post('/limpieza/asignar-semana', { inicio: limpiezaState.inicioSemana });
    if (res.ok) {
      toast(`Asignadas ${res.generados} tareas`);
      renderLimpieza(window.AppState.anio, window.AppState.mes);
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function toggleCompletado(id, checked) {
  try {
    await API.put(`/limpieza/asignaciones/${id}/toggle`, { completado: checked });
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ─── CONFIGURACIÓN DE TAREAS BASE ────────────────────────────────────

const POSIBLES = ['joni', 'nacho', 'vicky', 'fher'];

function abrirConfigTareas() {
  const html = `
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 0.9rem; margin-bottom: 10px;">Nueva Tarea</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input type="text" id="limpNombre" placeholder="Ej. Limpiar baños">
        </div>
        <div class="form-group">
          <label class="form-label">Día de Semana</label>
          <select id="limpDia">
            <option value="0">Domingo</option>
            <option value="1">Lunes</option>
            <option value="2">Martes</option>
            <option value="3">Miércoles</option>
            <option value="4">Jueves</option>
            <option value="5">Viernes</option>
            <option value="6">Sábado</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Posibles Encargados</label>
        <div class="chip-group" id="limpChips">
          ${POSIBLES.map(p => `<button type="button" class="chip active" data-val="${p}">${p}</button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary" onclick="guardarTareaBase()">Añadir Tarea</button>
    </div>
    
    <div class="divider"></div>
    
    <h3 style="font-size: 0.9rem; margin-bottom: 10px;">Tareas Configuradas</h3>
    <div class="item-list" id="listaTareasBase">
      ${limpiezaState.tareasBase.map(t => {
        const d = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][t.dia_semana];
        return `
          <div class="item-row">
            <div class="item-info">
              <div class="item-name">${t.nombre}</div>
              <div class="item-sub">Día: <b>${d}</b> | Por: ${t.encargados_posibles}</div>
            </div>
            <div class="item-actions">
              <button class="btn-icon" style="color:var(--red)" onclick="borrarTareaBase(${t.id})">🗑️</button>
            </div>
          </div>
        `;
      }).join('')}
      ${limpiezaState.tareasBase.length === 0 ? '<div class="empty-state-text">Sin tareas configuradas</div>' : ''}
    </div>
  `;

  openModal('Configurar Tareas de Limpieza', html);

  // Behavior for chips
  document.querySelectorAll('#limpChips .chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('active'));
  });
}

async function guardarTareaBase() {
  const nombre = document.getElementById('limpNombre').value.trim();
  const dia_semana = document.getElementById('limpDia').value;
  const actives = Array.from(document.querySelectorAll('#limpChips .chip.active')).map(el => el.dataset.val);
  
  if (!nombre) return toast('Falta nombre', 'error');
  if (actives.length === 0) return toast('Al menos un encargado', 'error');
  
  try {
    const res = await API.post('/limpieza/tareas', {
      nombre, dia_semana, encargados_posibles: actives.join(',')
    });

    if (res.ok) {
      toast('Tarea creada');
      await loadLimpiezaData();
      abrirConfigTareas(); // Refrescar modal
    }
  } catch (e) {
    toast('Error al guardar: ' + e.message, 'error');
  }
}

async function borrarTareaBase(id) {
  if(confirm('¿Borrar tarea y sus asignaciones futuras?')) {
    try {
      const res = await API.delete(`/limpieza/tareas/${id}`);
      if (res.ok) {
        toast('Tarea borrada');
        await loadLimpiezaData();
        abrirConfigTareas(); // Refrescar modal
        // Refrescar página de fondo si está visible
        if (window.AppState.page === 'limpieza') renderLimpieza(window.AppState.anio, window.AppState.mes);
      }
    } catch (e) {
      toast('Error al borrar: ' + e.message, 'error');
    }
  }
}
