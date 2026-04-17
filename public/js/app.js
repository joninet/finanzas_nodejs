// ── Estado global ──────────────────────────────────────────────
const now = new Date();
window.AppState = {
  page: 'resumen',
  anio: now.getFullYear(),
  mes: now.getMonth() + 1
};

const PAGE_TITLES = {
  'resumen': 'Resumen',
  'gastos-diarios': 'Gastos Diarios',
  'gastos-fijos': 'Gastos Fijos',
  'cuentas': 'Cuentas',
  'tarjetas': 'Tarjetas',
  'categorias': 'Categorías',
  'limpieza': 'Limpieza'
};

const PAGE_RENDERERS = {
  'resumen': renderResumen,
  'gastos-diarios': renderGastosDiarios,
  'gastos-fijos': renderGastosFijos,
  'cuentas': renderCuentas,
  'tarjetas': renderTarjetas,
  'categorias': renderCategorias,
  'limpieza': renderLimpieza
};

// ── Navegación ─────────────────────────────────────────────────
function navigate(page) {
  window.AppState.page = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;
  renderCurrentPage();
  // Cerrar sidebar en mobile
  document.getElementById('sidebar').classList.remove('open');
}

function renderCurrentPage() {
  const { page, anio, mes } = window.AppState;
  const renderer = PAGE_RENDERERS[page];
  if (renderer) renderer(anio, mes);
}

// ── Mes picker ────────────────────────────────────────────────
function updateMonthLabel() {
  const { anio, mes } = window.AppState;
  document.getElementById('monthLabel').textContent = mesLabel(anio, mes);
}

document.getElementById('prevMonth').addEventListener('click', () => {
  let { anio, mes } = window.AppState;
  mes--;
  if (mes < 1) { mes = 12; anio--; }
  window.AppState.anio = anio;
  window.AppState.mes = mes;
  updateMonthLabel();
  renderCurrentPage();
});

document.getElementById('nextMonth').addEventListener('click', () => {
  let { anio, mes } = window.AppState;
  mes++;
  if (mes > 12) { mes = 1; anio++; }
  window.AppState.anio = anio;
  window.AppState.mes = mes;
  updateMonthLabel();
  renderCurrentPage();
});

// ── Nav clicks ────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

// ── Sidebar mobile ────────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('sidebarClose').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});

// ── Modal ─────────────────────────────────────────────────────
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ── Init ──────────────────────────────────────────────────────
updateMonthLabel();
renderCurrentPage();
