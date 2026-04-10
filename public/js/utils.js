// ── Formato moneda ────────────────────────────────────────────
function fmtARS(n) {
  if (n == null) return '$ 0';
  return '$ ' + parseFloat(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Meses ──────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function mesLabel(anio, mes) {
  return MESES[mes - 1] + ' ' + anio;
}

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => { el.className = 'toast'; }, 2500);
}

// ── Modal ──────────────────────────────────────────────────────
function openModal(title, html, onOpen) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
  if (onOpen) onOpen();
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// ── Helpers HTML ───────────────────────────────────────────────
function selectCategorias(cats, selectedId, name = 'categoria_id', required = false) {
  const opts = cats
    .map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.parent_nombre ? '↳ ' : ''}${c.icono} ${c.nombre}</option>`)
    .join('');
  return `<select name="${name}" ${required ? 'required' : ''}><option value="">Sin categoría</option>${opts}</select>`;
}

function selectCuentas(cuentas, selectedId, name = 'cuenta_id') {
  const opts = cuentas
    .map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.icono} ${c.nombre} (${fmtARS(c.saldo)})</option>`)
    .join('');
  return `<select name="${name}"><option value="">—</option>${opts}</select>`;
}

function selectTarjetas(tarjetas, selectedId, name = 'tarjeta_id') {
  const opts = tarjetas
    .map(t => `<option value="${t.id}" ${t.id == selectedId ? 'selected' : ''}>${t.icono} ${t.nombre}</option>`)
    .join('');
  return `<select name="${name}"><option value="">—</option>${opts}</select>`;
}

function getFormData(formEl) {
  const data = {};
  new FormData(formEl).forEach((v, k) => { data[k] = v; });
  return data;
}

// ── Colores por defecto ────────────────────────────────────────
function colorDot(color) {
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:4px"></span>`;
}

// ── Fecha hoy ──────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Cuotas label ──────────────────────────────────────────────
function cuotaLabel(t) {
  if (!t.tarjeta_id) return '';
  if (t.cuotas > 1) return `${t.cuotas} cuotas`;
  return '1 cuota';
}

// ── Theme (Light/Dark) ──────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      setTheme(isLight ? 'dark' : 'light');
    });
  }
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '🌙';
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '🌞';
  }
}

// Inicializar el tema al cargar
initTheme();
