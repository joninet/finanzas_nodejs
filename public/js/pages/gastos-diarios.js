async function renderGastosDiarios(anio, mes) {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟳</div></div>';

  try {
    const [transacciones, categorias, cuentas, tarjetas] = await Promise.all([
      API.get(`/transacciones?anio=${anio}&mes=${mes}`),
      API.get('/categorias'),
      API.get('/cuentas'),
      API.get('/tarjetas')
    ]);

    const rows = transacciones.length
      ? transacciones.map(t => {
          const esTarjeta = !!t.tarjeta_id;
          const esIngreso = t.tipo === 'ingreso';
          const subInfo = esTarjeta
            ? `💳 ${t.tarjeta_nombre} · ${cuotaLabel(t)}`
            : (t.cuenta_nombre ? `🏦 ${t.cuenta_nombre}` : '');
          return `
            <div class="item-row">
              <div class="item-icon" style="background:${t.categoria_color||'#6366f1'}22">${t.categoria_icono||'📦'}</div>
              <div class="item-info">
                <div class="item-name">${t.descripcion}</div>
                <div class="item-sub">${t.fecha}${subInfo ? ' · ' + subInfo : ''}${t.categoria_nombre ? ' · ' + t.categoria_nombre : ''}</div>
              </div>
              <span class="item-amount ${esIngreso ? 'positive' : 'negative'}">${esIngreso ? '+' : '-'}${fmtARS(t.monto)}</span>
              <div class="item-actions">
                <button class="btn-icon" onclick="editarTransaccion(${t.id})" title="Editar">✎</button>
                <button class="btn-icon" onclick="eliminarTransaccion(${t.id}, ${anio}, ${mes})" title="Eliminar" style="color:var(--red)">✕</button>
              </div>
            </div>
          `;
        }).join('')
      : '<div class="empty-state"><div class="empty-state-icon">◎</div><div class="empty-state-text">Sin gastos este mes</div></div>';

    pc.innerHTML = `
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px">
        <button class="btn btn-ghost" onclick="abrirFormTransaccion('ingreso', ${anio}, ${mes}, null, null, null)">+ Ingreso</button>
        <button class="btn btn-primary" onclick="abrirFormTransaccion('gasto', ${anio}, ${mes}, null, null, null)">+ Gasto</button>
      </div>
      <div class="item-list">${rows}</div>
    `;
  } catch(e) {
    console.error(e);
    pc.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error</div></div>`;
  }
}

async function abrirFormTransaccion(tipoDefault, anio, mes, editId, cats, ctas) {
  // Cargar datos si no vienen
  const [categorias, cuentas, tarjetas] = cats
    ? [cats[0], cats[1], cats[2]]
    : await Promise.all([API.get('/categorias'), API.get('/cuentas'), API.get('/tarjetas')]);

  let editData = null;
  if (editId) editData = await API.get(`/transacciones?`).catch(() => null);

  const fechaDefault = `${anio}-${String(mes).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;

  openModal(editId ? 'Editar Transacción' : 'Nuevo Gasto/Ingreso', `
    <form id="frmTransaccion">
      <div class="form-group">
        <div class="chip-group" id="tipoChips">
          <button type="button" class="chip ${tipoDefault === 'gasto' ? 'active' : ''}" data-tipo="gasto" onclick="selectTipo('gasto')">Gasto</button>
          <button type="button" class="chip ${tipoDefault === 'ingreso' ? 'active' : ''}" data-tipo="ingreso" onclick="selectTipo('ingreso')">Ingreso</button>
        </div>
        <input type="hidden" name="tipo" id="inputTipo" value="${tipoDefault}">
      </div>

      <div class="form-group">
        <label class="form-label">Descripción *</label>
        <input name="descripcion" required placeholder="Ej: Pantalón, Supermercado..." />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Monto *</label>
          <input name="monto" type="number" step="0.01" min="0" required placeholder="0.00" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input name="fecha" type="date" value="${fechaDefault}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Categoría</label>
        ${selectCategorias(categorias, null)}
      </div>

      <div class="divider"></div>
      <div class="section-title">Medio de Pago</div>

      <div class="chip-group" id="pagoChips" style="margin-bottom:14px">
        <button type="button" class="chip active" data-pago="cuenta" onclick="selectPago('cuenta')">Cuenta / Débito</button>
        <button type="button" class="chip" data-pago="tarjeta" onclick="selectPago('tarjeta')">Tarjeta Crédito</button>
        <button type="button" class="chip" data-pago="efectivo" onclick="selectPago('efectivo')">Efectivo (sin cuenta)</button>
      </div>

      <div id="pagosCuenta" class="form-group">
        <label class="form-label">Cuenta</label>
        ${selectCuentas(cuentas, null)}
      </div>

      <div id="pagosTarjeta" style="display:none">
        <div class="form-group">
          <label class="form-label">Tarjeta</label>
          ${selectTarjetas(tarjetas, null)}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cuotas</label>
            <select name="cuotas" id="selectCuotas" onchange="toggleCuotaFecha()">
              ${[1,2,3,6,9,12,18,24].map(n => `<option value="${n}">${n === 1 ? '1 cuota' : n + ' cuotas'}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="cuotaFechaGroup" style="display:none">
            <label class="form-label">Mes 1ª cuota</label>
            <select name="mes_primera_cuota">
              ${MESES.map((m,i) => `<option value="${i+1}" ${i+1 === mes ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group" id="cuotaAnioGroup" style="display:none">
          <label class="form-label">Año 1ª cuota</label>
          <input name="anio_primera_cuota" type="number" value="${anio}" min="2020" max="2030" />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `);

  document.getElementById('frmTransaccion').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    data.tipo = document.getElementById('inputTipo').value;
    if (!data.cuenta_id) delete data.cuenta_id;
    if (!data.tarjeta_id) delete data.tarjeta_id;
    if (!data.categoria_id) delete data.categoria_id;
    data.cuotas = data.cuotas || 1;

    try {
      await API.post('/transacciones', data);
      toast('Gasto guardado ✓');
      closeModal();
      renderGastosDiarios(anio, mes);
    } catch(err) {
      toast('Error al guardar', 'error');
    }
  });
}

function selectTipo(tipo) {
  document.getElementById('inputTipo').value = tipo;
  document.querySelectorAll('#tipoChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.tipo === tipo);
  });
}

function selectPago(pago) {
  document.querySelectorAll('#pagoChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.pago === pago);
  });
  document.getElementById('pagosCuenta').style.display = pago === 'cuenta' ? 'block' : 'none';
  document.getElementById('pagosTarjeta').style.display = pago === 'tarjeta' ? 'block' : 'none';
  // Limpiar campos del otro
  if (pago !== 'tarjeta') {
    const sel = document.querySelector('[name=tarjeta_id]');
    if (sel) sel.value = '';
  }
  if (pago !== 'cuenta') {
    const sel = document.querySelector('[name=cuenta_id]');
    if (sel) sel.value = '';
  }
}

function toggleCuotaFecha() {
  const cuotas = parseInt(document.getElementById('selectCuotas').value);
  const show = cuotas > 1;
  document.getElementById('cuotaFechaGroup').style.display = show ? 'block' : 'none';
  document.getElementById('cuotaAnioGroup').style.display = show ? 'block' : 'none';
}

async function eliminarTransaccion(id, anio, mes) {
  if (!confirm('¿Eliminar este gasto?')) return;
  try {
    await API.delete(`/transacciones/${id}`);
    toast('Eliminado');
    renderGastosDiarios(anio, mes);
  } catch(e) {
    toast('Error', 'error');
  }
}

async function editarTransaccion(id) {
  toast('Edición próximamente', 'success');
}
