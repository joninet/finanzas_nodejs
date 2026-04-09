async function renderResumen(anio, mes) {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟳</div><div>Cargando...</div></div>';

  try {
    const [resumen, fijos] = await Promise.all([
      API.get(`/resumen?anio=${anio}&mes=${mes}`),
      API.get(`/gastos-fijos-mensuales?anio=${anio}&mes=${mes}`)
    ]);

    const totalTarjetas = resumen.cuotas_tarjeta.reduce((s, t) => s + t.total_mes, 0);
    const totalGeneral = resumen.gastos_diarios + resumen.gastos_fijos + totalTarjetas;

    // Categorías bar
    const maxCat = resumen.por_categoria[0]?.total || 1;
    const catBars = resumen.por_categoria.map(c => `
      <div class="cat-bar-item">
        <div class="cat-bar-header">
          <span>${c.icono || '📦'} ${c.nombre || 'Sin categoría'}</span>
          <span>${fmtARS(c.total)}</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${(c.total/maxCat*100).toFixed(1)}%;background:${c.color || '#6366f1'}"></div>
        </div>
      </div>
    `).join('');

    // Tarjetas del mes
    const tarjetasRows = resumen.cuotas_tarjeta.length
      ? resumen.cuotas_tarjeta.map(t => `
        <div class="tarjeta-month-card">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="item-icon" style="background:${t.color}22">${t.icono}</div>
            <span style="font-size:.9rem;font-weight:500">${t.nombre}</span>
          </div>
          <span class="item-amount negative">${fmtARS(t.total_mes)}</span>
        </div>
      `).join('')
      : '<div class="empty-state" style="padding:20px"><div class="empty-state-text">Sin cuotas este mes</div></div>';

    // Gastos fijos
    const fijosRows = fijos.length
      ? fijos.map(f => `
        <div class="item-row">
          <div class="item-icon" style="background:${f.categoria_color||'#6366f1'}22">${f.categoria_icono || '📦'}</div>
          <div class="item-info">
            <div class="item-name">${f.nombre}</div>
            <div class="item-sub">${f.tarjeta_nombre ? '💳 ' + f.tarjeta_nombre : f.cuenta_nombre || ''}</div>
          </div>
          <span class="badge ${f.pagado ? 'badge-green' : 'badge-yellow'}">${f.pagado ? '✓ Pagado' : 'Pendiente'}</span>
          <span class="item-amount negative">${fmtARS(f.monto)}</span>
        </div>
      `).join('')
      : `<div class="empty-state" style="padding:16px">
          <div class="empty-state-text">No hay gastos fijos para este mes.</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="cargarGastosFijosAlMes(${anio},${mes})">Cargar plantillas</button>
         </div>`;

    pc.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card green">
          <div class="stat-label">Ingresos</div>
          <div class="stat-value green">${fmtARS(resumen.ingresos)}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Gastos Diarios</div>
          <div class="stat-value red">${fmtARS(resumen.gastos_diarios)}</div>
        </div>
        <div class="stat-card yellow">
          <div class="stat-label">Gastos Fijos</div>
          <div class="stat-value yellow">${fmtARS(resumen.gastos_fijos)}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Total Tarjetas</div>
          <div class="stat-value blue">${fmtARS(totalTarjetas)}</div>
        </div>
      </div>

      <div class="card" style="border-top: 2px solid var(--red)">
        <div class="card-header">
          <span class="card-title">Total del mes</span>
          <span class="item-amount negative" style="font-size:1.3rem">${fmtARS(totalGeneral)}</span>
        </div>
        ${resumen.ingresos > 0 ? `
        <div style="display:flex;justify-content:space-between;font-size:.85rem;color:var(--text2)">
          <span>Balance</span>
          <span style="color:${resumen.ingresos - totalGeneral >= 0 ? 'var(--accent)' : 'var(--red)'};font-weight:600">
            ${fmtARS(resumen.ingresos - totalGeneral)}
          </span>
        </div>` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Gastos Fijos del Mes</span>
          ${fijos.length === 0 ? '' : `<button class="btn btn-ghost btn-sm" onclick="cargarGastosFijosAlMes(${anio},${mes})">+ Cargar plantillas</button>`}
        </div>
        <div class="item-list">${fijosRows}</div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Cuotas Tarjetas</span>
        </div>
        ${tarjetasRows}
      </div>

      ${resumen.por_categoria.length ? `
      <div class="card">
        <div class="card-header"><span class="card-title">Por Categoría</span></div>
        ${catBars}
      </div>` : ''}
    `;
  } catch(e) {
    pc.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error cargando datos</div></div>`;
    console.error(e);
  }
}

async function cargarGastosFijosAlMes(anio, mes) {
  try {
    const r = await API.post('/gastos-fijos-mensuales/cargar', { anio, mes });
    toast(`${r.cargados} plantillas cargadas`);
    renderResumen(anio, mes);
  } catch(e) {
    toast('Error al cargar', 'error');
  }
}
