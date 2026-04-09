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
        <button class="btn-icon" onclick="eliminarMensual(${m.id}, ${anio}, ${mes})" style="color:var(--red)">✕</button>
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
            <button class="btn btn-ghost btn-sm" onclick="cargarGastosFijosAlMes(${anio},${mes})">Cargar plantillas</button>
          </div>
        </div>
        ${totalFijos > 0 ? `<div style="font-size:.85rem;color:var(--text2);margin-bottom:12px">Total: <strong style="color:var(--red)">${fmtARS(totalFijos)}</strong></div>` : ''}
        ${mensuales.length
          ? `<div class="item-list">${mensuales.map(renderMensual).join('')}</div>`
          : `<div class="empty-state" style="padding:16px">
               <div class="empty-state-text">Sin gastos confirmados para este mes.</div>
               <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="cargarGastosFijosAlMes(${anio},${mes})">Cargar plantillas</button>
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
        <label class="form-label">Monto mensual *</label>
        <input name="monto" type="number" step="0.01" min="0" required placeholder="0.00" value="${es ? editData.monto : ''}" />
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
  await API.put(`/gastos-fijos-mensuales/${id}`, { pagado, monto: 0 });
  // Actualizar solo el badge sin re-renderizar todo
  renderGastosFijos(anio, mes);
}

async function eliminarMensual(id, anio, mes) {
  if (!confirm('¿Quitar este gasto del mes?')) return;
  await API.delete(`/gastos-fijos-mensuales/${id}`);
  toast('Eliminado del mes');
  renderGastosFijos(anio, mes);
}
