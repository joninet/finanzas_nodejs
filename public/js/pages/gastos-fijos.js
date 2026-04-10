async function renderGastosFijos(anio, mes) {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟳</div></div>';

  try {
    const [plantillas, mensuales, categorias, cuentas, tarjetas] = await Promise.all([
      API.get('/gastos-fijos'),
      API.get(`/gastos-fijos-mensuales?anio=${anio}&mes=${mes}`),
      API.get('/categorias'),
      API.get('/cuentas'),
      API.get('/tarjetas')
    ]);

    const renderPlantilla = (p) => `
      <div class="item-row">
        <div class="item-icon" style="background:${p.categoria_color||'#6366f1'}22">${p.categoria_icono||'📦'}</div>
        <div class="item-info">
          <div class="item-name">${p.nombre}</div>
          <div class="item-sub">${p.tarjeta_nombre ? '💳 ' + p.tarjeta_nombre : (p.cuenta_nombre ? '🏦 ' + p.cuenta_nombre : 'Sin medio')}</div>
        </div>
        <span class="item-amount negative">${fmtARS(p.monto)}</span>
        <div class="item-actions">
          <button class="btn-icon" onclick="editarPlantilla(${p.id}, ${JSON.stringify(p).replace(/"/g,'&quot;')})" title="Editar">✎</button>
          <button class="btn-icon" onclick="eliminarPlantilla(${p.id})" title="Eliminar" style="color:var(--red)">✕</button>
        </div>
      </div>
    `;

    const renderMensual = (m) => `
      <div class="item-row">
        <div class="item-icon" style="background:${m.categoria_color||'#6366f1'}22">${m.categoria_icono||'📦'}</div>
        <div class="item-info">
          <div class="item-name">${m.nombre}</div>
          <div class="item-sub">${m.tarjeta_nombre ? '💳 ' + m.tarjeta_nombre : (m.cuenta_nombre ? '🏦 ' + m.cuenta_nombre : '')}</div>
        </div>
        <label class="checkbox-row" style="padding:0;gap:8px" title="Marcar como pagado">
          <input type="checkbox" ${m.pagado ? 'checked' : ''} onchange="togglePagadoFijo(${m.id}, this.checked, ${anio}, ${mes})" />
          <span class="badge ${m.pagado ? 'badge-green' : 'badge-yellow'}">${m.pagado ? 'Pagado' : 'Pendiente'}</span>
        </label>
        <span class="item-amount negative">${fmtARS(m.monto)}</span>
        <div class="item-actions">
           <button class="btn-icon" onclick="abrirFormMensual(${anio}, ${mes}, ${JSON.stringify(m).replace(/"/g,'&quot;')})" title="Editar monto/detalle">✎</button>
           <button class="btn-icon" onclick="eliminarMensual(${m.id}, ${anio}, ${mes})" style="color:var(--red)">✕</button>
        </div>
      </div>
    `;

    const totalFijos = mensuales.reduce((s, m) => s + m.monto, 0);

    pc.innerHTML = `
      <!-- Plantillas -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Plantillas de Gastos Fijos</span>
          <button class="btn btn-primary btn-sm" onclick="abrirFormPlantilla(null)">+ Nueva plantilla</button>
        </div>
        <p style="font-size:.8rem;color:var(--text3);margin-bottom:12px">Se aplican como base cada mes. Podés modificar el monto al confirmarlos.</p>
        ${plantillas.length
          ? `<div class="item-list">${plantillas.map(renderPlantilla).join('')}</div>`
          : '<div class="empty-state" style="padding:16px"><div class="empty-state-text">Sin plantillas aún</div></div>'
        }
      </div>

      <!-- Mes actual -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Confirmados — ${mesLabel(anio, mes)}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="abrirFormMensual(${anio},${mes}, null)">+ Gasto puntual</button>
            <button class="btn btn-ghost btn-sm" onclick="abrirModalCargarPlantillas(${anio},${mes})">Cargar plantillas</button>
          </div>
        </div>
        ${totalFijos > 0 ? `<div style="font-size:.85rem;color:var(--text2);margin-bottom:12px">Total: <strong style="color:var(--red)">${fmtARS(totalFijos)}</strong></div>` : ''}
        ${mensuales.length
          ? `<div class="item-list">${mensuales.map(renderMensual).join('')}</div>`
          : `<div class="empty-state" style="padding:16px">
               <div class="empty-state-text">Sin gastos confirmados para este mes.</div>
               <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="abrirModalCargarPlantillas(${anio},${mes})">Cargar plantillas</button>
             </div>`
        }
      </div>
    `;
  } catch(e) {
    console.error(e);
    pc.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error</div></div>`;
  }
}

async function abrirFormPlantilla(editData) {
  const [categorias, cuentas, tarjetas] = await Promise.all([
    API.get('/categorias'), API.get('/cuentas'), API.get('/tarjetas')
  ]);

  const es = !!editData;
  openModal(es ? 'Editar Plantilla' : 'Nueva Plantilla', `
    <form id="frmPlantilla">
      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input name="nombre" required placeholder="Ej: Alquiler, Luz, Colegio..." value="${es ? editData.nombre : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Monto mensual (opcional)</label>
        <input name="monto" type="number" step="0.01" min="0" placeholder="0.00" value="${es ? editData.monto : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Categoría</label>
        ${selectCategorias(categorias, es ? editData.categoria_id : null)}
      </div>
      <div class="divider"></div>
      <div class="section-title">Medio de Pago (opcional)</div>
      <div class="form-group">
        <label class="form-label">Cuenta</label>
        ${selectCuentas(cuentas, es ? editData.cuenta_id : null)}
      </div>
      <div class="form-group">
        <label class="form-label">Tarjeta de Crédito</label>
        ${selectTarjetas(tarjetas, es ? editData.tarjeta_id : null)}
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${es ? 'Actualizar' : 'Crear'}</button>
      </div>
    </form>
  `);

  document.getElementById('frmPlantilla').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    if (!data.cuenta_id) delete data.cuenta_id;
    if (!data.tarjeta_id) delete data.tarjeta_id;
    if (!data.categoria_id) delete data.categoria_id;
    try {
      if (es) {
        await API.put(`/gastos-fijos/${editData.id}`, { ...data, activo: 1 });
        toast('Plantilla actualizada ✓');
      } else {
        await API.post('/gastos-fijos', data);
        toast('Plantilla creada ✓');
      }
      closeModal();
      const { anio, mes } = window.AppState;
      renderGastosFijos(anio, mes);
    } catch(err) {
      toast('Error', 'error');
    }
  });
}

async function editarPlantilla(id, data) {
  await abrirFormPlantilla(data);
}

async function eliminarPlantilla(id) {
  if (!confirm('¿Eliminar esta plantilla?')) return;
  await API.delete(`/gastos-fijos/${id}`);
  toast('Eliminada');
  const { anio, mes } = window.AppState;
  renderGastosFijos(anio, mes);
}

async function togglePagadoFijo(id, pagado, anio, mes) {
  await API.put(`/gastos-fijos-mensuales/${id}`, { pagado });
  // Actualizar solo el badge sin re-renderizar todo
  renderGastosFijos(anio, mes);
}

async function eliminarMensual(id, anio, mes) {
  if (!confirm('¿Quitar este gasto del mes?')) return;
  await API.delete(`/gastos-fijos-mensuales/${id}`);
  toast('Eliminado del mes');
  renderGastosFijos(anio, mes);
}

async function abrirFormMensual(anio, mes, editData) {
  const [categorias, cuentas, tarjetas] = await Promise.all([
    API.get('/categorias'), API.get('/cuentas'), API.get('/tarjetas')
  ]);

  const es = !!editData;
  openModal(es ? 'Editar Gasto' : 'Nuevo Gasto Puntual', `
    <form id="frmMensual">
      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input name="nombre" required placeholder="Ej: Renovación Seguros..." value="${es ? editData.nombre : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Monto *</label>
        <input name="monto" type="number" step="0.01" min="0" required placeholder="0.00" value="${es ? editData.monto : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Categoría</label>
        ${selectCategorias(categorias, es ? editData.categoria_id : null)}
      </div>
      <div class="divider"></div>
      <div class="section-title">Medio de Pago</div>
      <div class="form-group">
        <label class="form-label">Cuenta</label>
        ${selectCuentas(cuentas, es ? editData.cuenta_id : null)}
      </div>
      <div class="form-group">
        <label class="form-label">Tarjeta de Crédito</label>
        ${selectTarjetas(tarjetas, es ? editData.tarjeta_id : null)}
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${es ? 'Actualizar' : 'Crear'}</button>
      </div>
    </form>
  `);

  document.getElementById('frmMensual').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    data.anio = anio;
    data.mes = mes;
    
    if (!data.cuenta_id) delete data.cuenta_id;
    if (!data.tarjeta_id) delete data.tarjeta_id;
    if (!data.categoria_id) delete data.categoria_id;

    try {
      if (es) {
        await API.put(`/gastos-fijos-mensuales/${editData.id}`, data);
        toast('Gasto actualizado ✓');
      } else {
        await API.post('/gastos-fijos-mensuales/puntual', data);
        toast('Gasto puntual creado ✓');
      }
      closeModal();
      renderGastosFijos(anio, mes);
    } catch(err) {
      toast('Error', 'error');
    }
  });
}

async function abrirModalCargarPlantillas(anio, mes) {
  try {
    const plantillas = await API.get('/gastos-fijos');
    if (!plantillas.length) return toast('No hay plantillas activas');
    
    const html = `
      <form id="frmCargarPlantillas">
        <p style="margin-bottom:12px;font-size:0.9rem;color:var(--text2)">Seleccioná qué plantillas querés cargar al mes:</p>
        <div class="plantillas-list" style="display:flex;flex-direction:column;gap:10px;max-height:300px;overflow-y:auto;margin-bottom:16px;">
          ${plantillas.map(p => `
            <label class="checkbox-row" style="padding:8px 12px;background:var(--bg2);border-radius:8px">
              <input type="checkbox" name="plantillas_ids" value="${p.id}" checked />
              <div style="display:flex;flex-direction:column">
                <span style="font-weight:500">${p.nombre}</span>
                <span style="font-size:0.8rem;color:var(--text3)">${fmtARS(p.monto)}</span>
              </div>
            </label>
          `).join('')}
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Cargar Seleccionadas</button>
        </div>
      </form>
    `;
    
    openModal('Cargar Plantillas', html);
    
    document.getElementById('frmCargarPlantillas').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const ids = formData.getAll('plantillas_ids');
      if (!ids.length) {
        toast('Seleccioná al menos una');
        return;
      }
      try {
        await API.post('/gastos-fijos-mensuales/cargar', { anio, mes, plantillas_ids: ids });
        toast('Plantillas cargadas');
        closeModal();
        renderGastosFijos(anio, mes);
      } catch(err) {
        toast('Error', 'error');
      }
    });

  } catch (e) {
    console.error(e);
  }
}

