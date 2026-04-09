# Gastos App 💰

Control de gastos personal — Node.js + Express + SQLite

## Instalación local

```bash
npm install
npm start
# → http://localhost:3000
```

## Deploy en Railway (gratis)

1. Crear cuenta en https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Subir este código a un repo de GitHub
4. Railway detecta el `package.json` y despliega automáticamente
5. En Settings → Variables agregar: `NODE_ENV=production`
6. Para persistir la DB: ir a "Volumes" y montar en `/data`, luego agregar variable `DB_PATH=/data/gastos.db`

## Deploy en Render (gratis)

1. Crear cuenta en https://render.com
2. "New Web Service" → conectar repo GitHub
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Para persistir la DB: usar "Disks" y montar en `/data`, agregar `DB_PATH=/data/gastos.db`

## Estructura

```
gastos-app/
├── server.js           # Entry point Express
├── db/database.js      # SQLite schema e init
├── routes/
│   ├── config.js       # Categorías, cuentas, tarjetas
│   └── gastos.js       # Gastos fijos, transacciones, resumen
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── utils.js
        ├── app.js
        └── pages/      # Una página por sección
```

## Funcionalidades

- ✅ Resumen mensual con totales y balance
- ✅ Gastos diarios (con cuenta o tarjeta crédito en cuotas)
- ✅ Descuento automático de saldo en cuentas
- ✅ Gastos fijos como plantillas reutilizables
- ✅ Confirmación manual de fijos mes a mes
- ✅ Tarjetas de crédito con cálculo de cuotas por mes
- ✅ Categorías y subcategorías personalizables
- ✅ Gráfico de gastos por categoría
- ✅ Responsive (mobile-first)
