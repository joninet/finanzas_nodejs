async function renderCategorias(anio, mes) {
  const pc = document.getElementById('pageContent');
  pc.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟳</div></div>';

  try {
    const cats = await API.get('/categorias');
    const padres = cats.filter(c => !c.parent_id);
    const hijas = cats.filter(c => !!c.parent_id);

    const renderCat = (c, esHija = false) => {
      const subcats = hijas.filter(h => h.parent_id === c.id);
      return `
        <div class="item-row" style="${esHija ? 'margin-left:24px;border-left:2px solid var(--border2)' : ''}">
          <div class="item-icon" style="background:${c.color}22;color:${c.color}">${c.icono}</div>
          <div class="item-info">
            <div class="item-name">${c.nombre}</div>
            ${!esHija && subcats.length ? `<div class="item-sub">${subcats.length} subcategoría${subcats.length > 1 ? 's' : ''}</div>` : ''}
          </div>
          <div class="item-actions">
            ${!esHija ? `<button class="btn btn-ghost btn-sm" onclick="abrirFormCategoria(null, ${c.id})">+ Sub</button>` : ''}
            <button class="btn-icon" onclick="editarCategoria(${c.id})" title="Editar">✎</button>
            <button class="btn-icon" onclick="eliminarCategoria(${c.id})" title="Eliminar" style="color:var(--red)">✕</button>
          </div>
        </div>
        ${subcats.map(s => renderCat(s, true)).join('')}
      `;
    };

    pc.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-primary" onclick="abrirFormCategoria(null, null)">+ Nueva categoría</button>
      </div>
      <div class="item-list">
        ${padres.length
          ? padres.map(c => renderCat(c)).join('')
          : '<div class="empty-state"><div class="empty-state-text">Sin categorías</div></div>'
        }
      </div>
    `;
  } catch(e) {
    console.error(e);
    pc.innerHTML = `<div class="empty-state"><div class="empty-state-text">Error</div></div>`;
  }
}

async function abrirFormCategoria(editData, parentIdDefault) {
  const cats = await API.get('/categorias');
  const padres = cats.filter(c => !c.parent_id);
  const es = !!editData;

  openModal(es ? 'Editar Categoría' : 'Nueva Categoría', `
    <form id="frmCategoria">
      <div class="form-group">
        <label class="form-label">Nombre *</label>
        <input name="nombre" required placeholder="Ej: Alimentación, Salud..." value="${es ? editData.nombre : ''}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Icono (emoji)</label>
          <input name="icono" placeholder="📦" value="${es ? editData.icono : '📦'}" maxlength="4" />
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <input name="color" type="color" value="${es ? editData.color : '#6366f1'}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Subcategoría de</label>
        <select name="parent_id">
          <option value="">— Categoría principal —</option>
          ${padres.map(p => `<option value="${p.id}" ${(es ? editData.parent_id : parentIdDefault) == p.id ? 'selected' : ''}>${p.icono} ${p.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">${es ? 'Actualizar' : 'Crear'}</button>
      </div>
    </form>
  `);

  document.getElementById('frmCategoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData(e.target);
    if (!data.parent_id) delete data.parent_id;
    try {
      if (es) {
        await API.put(`/categorias/${editData.id}`, data);
        toast('Categoría actualizada ✓');
      } else {
        await API.post('/categorias', data);
        toast('Categoría creada ✓');
      }
      closeModal();
      const { anio, mes } = window.AppState;
      renderCategorias(anio, mes);
    } catch(err) {
      toast('Error', 'error');
    }
  });
}

async function editarCategoria(id) {
  const cats = await API.get('/categorias');
  const c = cats.find(x => x.id === id);
  if (c) abrirFormCategoria(c, null);
}

async function eliminarCategoria(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  await API.delete(`/categorias/${id}`);
  toast('Categoría eliminada');
  const { anio, mes } = window.AppState;
  renderCategorias(anio, mes);
}
