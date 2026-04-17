require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', require('./routes/config'));
app.use('/api', require('./routes/gastos'));
app.use('/api', require('./routes/limpieza'));
const { pushRouter } = require('./routes/push');
app.use('/api', pushRouter);

// Inicializar CronJobs
require('./push-cron');

// Gasto mobile standalone
app.get('/gasto', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gasto.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Gastos App corriendo en http://localhost:${PORT}`);
});
