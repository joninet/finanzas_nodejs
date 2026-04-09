async function renderCuentas(anio, mes) {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟳</div></div>';

  try {
    const cuentas = await API.get('/cuentas');

    const rows = cuentas.length
      ? cuentas.map(c => `
        <div class="item-row">
          <div class="item-icon" style="background:${c.color}22;color:${c.color};font-size:1.2rem">${c.icono}</div>
          <div class="item-info">
            <div class="item-name">${c.nombre}</div>
            <div class="item-sub">${tipoLabel(c.tipo)} · ${c.moneda}</div>
          </div>
          <span class="item-amount ${c.saldo >= 0 ? 'positive' : 'negative'}" style="font-size:1.05rem">${fmtARS(c.saldo)}</span>
          <div class="item-actions">
            <button class="btn btn-ghost btn-sm" onclick="abrirMovimiento(${c.id}, '${c.nombre}', ${anio}, ${mes})">+ Mov.</button>
            <button class="btn-icon" onclick="editarCuenta(${c.id})" title="Editar">✎</button>
            <button class="btn-icon" onclick="eliminarCuenta(${c.id})" title="Eliminar" style="color:var(--red)">✕</button>
          </div>
        </div>
      `).join('')
      : '<div class="empty-state"><div class="empty-state-icon">◇</div><div class="empty-state-text">Sin cuentas aún</div></div>';

    const totalSaldo = cuentas.reduce((s, c) => s + c.saldo, 0);

    pc.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="stat-label">Saldo Total</div>
            <div class="stat-value ${totalSaldo >= 0 ? 'green' : 'red'}">${fmtARS(totalSaldo)}</div>
          </div>
          <button class="btn btn-primary" onclick="abrirFormCuenta(null)">+ Nueva cuenta</button>
        </div>
      </div>
      <div class="item-list">${rows}</div>
    `;
  } catch(e) {
    console.error(e);
    pc.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error</div></div>`;
  }
}

function tipoLabel(tipo) {
  const map = { efectivo: 'Efectivo', debito: 'Débito', ahorro: 'Caja de Ahorro', otro: 'Otro' };
  return map[tipo] || tipo;
}

async function abrirFormCuenta(editData) {
  const es = !!editData;
  openModal(es ? 'Editar Cuenta' : 'Nueva Cuenta', `
    <form id="frmCuenta">
      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input name="nombre" required placeholder="Ej: Galicia, Mercado Pago, Efectivo..." value="${es ? editData.nombre : ''}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select name="tipo">
            ${['efectivo','debito','ahorro','otro'].map(t => `<option value="${t}" ${es && editData.tipo === t ? 'selected' : ''}>${tipoLabel(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Moneda</label>
          <select name="moneda">
            <option value="ARS" ${!es || editData.moneda === 'ARS' ? 'selected' : ''}>ARS $</option>
            <option value="USD" ${es && editData.moneda === 'USD' ? 'selected' : ''}>USD $</option>
          </select>
        </div>
      </div>
      ${!es ? `
      <div class="form-group">
        <label class="form-label">Saldo inicial</label>
        <input name="saldo" type="number" step="0.01" value="0" placeholder="0.00" />
      </div>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Icono (emoji)</label>
          <input name="icono" placeholder="🏦" value="${es ? editData.icono : '🏦'}" maxlength="4" />
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <input name="color" type="color" value="${es ? editData.color : '#10b981'}" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${es ? 'Actualizar' : 'Crear'}</button>
      </div>
    </form>
  `);

  document.getElementById('frmCuenta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    try {
      if (es) {
        await API.put(`/cuentas/${editData.id}`, data);
        toast('Cuenta actualizada ✓');
      } else {
        await API.post('/cuentas', data);
        toast('Cuenta creada ✓');
      }
      closeModal();
      const { anio, mes } = window.AppState;
      renderCuentas(anio, mes);
    } catch(err) {
      toast('Error', 'error');
    }
  });
}

async function editarCuenta(id) {
  const cuentas = await API.get('/cuentas');
  const c = cuentas.find(x => x.id === id);
  if (c) abrirFormCuenta(c);
}

async function eliminarCuenta(id) {
  if (!confirm('¿Eliminar esta cuenta? Se perderán todos sus movimientos.')) return;
  await API.delete(`/cuentas/${id}`);
  toast('Cuenta eliminada');
  const { anio, mes } = window.AppState;
  renderCuentas(anio, mes);
}

async function abrirMovimiento(cuentaId, nombre, anio, mes) {
  openModal(`Movimiento — ${nombre}`, `
    <form id="frmMovimiento">
      <div class="form-group">
        <div class="chip-group" id="movChips">
          <button type="button" class="chip active" data-mov="ingreso" onclick="selectMov('ingreso')">Ingreso</button>
          <button type="button" class="chip" data-mov="egreso" onclick="selectMov('egreso')">Egreso</button>
        </div>
        <input type="hidden" name="tipo" id="inputMovTipo" value="ingreso">
      </div>
      <div class="form-group">
        <label class="form-label">Monto *</label>
        <input name="monto" type="number" step="0.01" min="0" required placeholder="0.00" />
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input name="descripcion" placeholder="Ej: Sueldo, Retiro ATM..." />
      </div>
      <div class="form-group">
        <label class="form-label">Fecha</label>
        <input name="fecha" type="date" value="${today()}" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Confirmar</button>
      </div>
    </form>
  `);

  document.getElementById('frmMovimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    data.tipo = document.getElementById('inputMovTipo').value;
    try {
      await API.post(`/cuentas/${cuentaId}/movimiento`, data);
      toast('Movimiento registrado ✓');
      closeModal();
      renderCuentas(anio, mes);
    } catch(err) {
      toast('Error', 'error');
    }
  });
}

function selectMov(tipo) {
  document.getElementById('inputMovTipo').value = tipo;
  document.querySelectorAll('#movChips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mov === tipo);
  });
}
