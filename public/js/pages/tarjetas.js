async function renderTarjetas(anio, mes) {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟳</div></div>';

  try {
    const tarjetas = await API.get('/tarjetas');

    // Para cada tarjeta, calcular cuánto vence este mes
    const resumen = await API.get(`/resumen?anio=${anio}&mes=${mes}`);
    const cuotasPorTarjeta = {};
    resumen.cuotas_tarjeta.forEach(t => { cuotasPorTarjeta[t.id] = t.total_mes; });

    const rows = tarjetas.length
      ? tarjetas.map(t => {
          const totalMes = cuotasPorTarjeta[t.id] || 0;
          return `
            <div class="item-row" style="flex-wrap:wrap;gap:10px">
              <div class="item-icon" style="background:${t.color}22;color:${t.color};font-size:1.2rem">${t.icono}</div>
              <div class="item-info">
                <div class="item-name">${t.nombre}</div>
                <div class="item-sub">${t.banco || 'Sin banco'}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.8px">Vence este mes</div>
                <span class="item-amount negative" style="font-size:1.05rem">${fmtARS(totalMes)}</span>
              </div>
              <div class="item-actions">
                <button class="btn btn-ghost btn-sm" onclick="verCuotasTarjeta(${t.id}, '${t.nombre}', ${anio}, ${mes})">Ver cuotas</button>
                <button class="btn-icon" onclick="editarTarjeta(${t.id})" title="Editar">✎</button>
                <button class="btn-icon" onclick="eliminarTarjeta(${t.id})" title="Eliminar" style="color:var(--red)">✕</button>
              </div>
            </div>
          `;
        }).join('')
      : '<div class="empty-state"><div class="empty-state-icon">▭</div><div class="empty-state-text">Sin tarjetas aún</div></div>';

    pc.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-primary" onclick="abrirFormTarjeta(null)">+ Nueva tarjeta</button>
      </div>
      <div class="item-list">${rows}</div>
    `;
  } catch(e) {
    console.error(e);
    pc.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error</div></div>`;
  }
}

async function abrirFormTarjeta(editData) {
  const es = !!editData;
  openModal(es ? 'Editar Tarjeta' : 'Nueva Tarjeta de Crédito', `
    <form id="frmTarjeta">
      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input name="nombre" required placeholder="Ej: Visa Galicia, Naranja X..." value="${es ? editData.nombre : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Banco / Emisor</label>
        <input name="banco" placeholder="Ej: Galicia, BBVA, Naranja..." value="${es ? editData.banco || '' : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Límite</label>
        <input name="limite" type="number" step="0.01" value="${es ? editData.limite : 0}" placeholder="0.00" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Icono (emoji)</label>
          <input name="icono" placeholder="💳" value="${es ? editData.icono : '💳'}" maxlength="4" />
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <input name="color" type="color" value="${es ? editData.color : '#f59e0b'}" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${es ? 'Actualizar' : 'Crear'}</button>
      </div>
    </form>
  `);

  document.getElementById('frmTarjeta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    try {
      if (es) {
        await API.put(`/tarjetas/${editData.id}`, data);
        toast('Tarjeta actualizada ✓');
      } else {
        await API.post('/tarjetas', data);
        toast('Tarjeta creada ✓');
      }
      closeModal();
      const { anio, mes } = window.AppState;
      renderTarjetas(anio, mes);
    } catch(err) {
      toast('Error', 'error');
    }
  });
}

async function editarTarjeta(id) {
  const tarjetas = await API.get('/tarjetas');
  const t = tarjetas.find(x => x.id === id);
  if (t) abrirFormTarjeta(t);
}

async function eliminarTarjeta(id) {
  if (!confirm('¿Eliminar esta tarjeta?')) return;
  await API.delete(`/tarjetas/${id}`);
  toast('Tarjeta eliminada');
  const { anio, mes } = window.AppState;
  renderTarjetas(anio, mes);
}

async function verCuotasTarjeta(tarjetaId, nombre, anio, mes) {
  const transacciones = await API.get(`/transacciones?tarjeta_id=${tarjetaId}`);
  
  // Filtrar solo las que tienen cuotas activas en el mes seleccionado
  const activas = transacciones.filter(t => {
    if (!t.anio_primera_cuota) return true;
    const ini = t.anio_primera_cuota * 12 + t.mes_primera_cuota - 1;
    const fin = ini + t.cuotas - 1;
    const actual = anio * 12 + mes - 1;
    return actual >= ini && actual <= fin;
  });

  const rows = activas.length
    ? activas.map(t => {
        const ini = t.anio_primera_cuota * 12 + (t.mes_primera_cuota - 1);
        const actual = anio * 12 + (mes - 1);
        const cuotaActual = actual - ini + 1;
        return `
          <div class="item-row">
            <div class="item-info">
              <div class="item-name">${t.descripcion}</div>
              <div class="item-sub">${t.cuotas > 1 ? `Cuota ${cuotaActual}/${t.cuotas}` : '1 pago'} · ${t.fecha}</div>
            </div>
            <span class="item-amount negative">${fmtARS(t.monto / t.cuotas)}</span>
          </div>
        `;
      }).join('')
    : '<div class="empty-state" style="padding:20px"><div class="empty-state-text">Sin cuotas activas este mes</div></div>';

  const total = activas.reduce((s, t) => s + t.monto / t.cuotas, 0);

  openModal(`${nombre} — ${mesLabel(anio, mes)}`, `
    <div style="margin-bottom:12px;padding:12px;background:var(--bg3);border-radius:var(--radius-sm);display:flex;justify-content:space-between">
      <span style="color:var(--text2);font-size:.85rem">Total a pagar</span>
      <span class="item-amount negative" style="font-size:1.1rem">${fmtARS(total)}</span>
    </div>
    <div class="item-list">${rows}</div>
  `);
}
