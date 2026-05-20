const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { startHealthCheckJob } = require('./jobs/healthCheck.job');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/connections', require('./routes/connections.routes'));
app.use('/api/metrics',     require('./routes/metrics.routes'));
app.use('/api/queries',     require('./routes/queries.routes'));
app.use('/api/concurrency', require('./routes/concurrency.routes'));
app.use('/api/backups',     require('./routes/backup.routes'));
app.use('/api/replication', require('./routes/replication.routes'));
app.use('/api/cache',       require('./routes/cache.routes'));
app.use('/api/alerts',      require('./routes/alerts.routes'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 DataOps Control Center API funcionando',
    version: '1.0.0',
    status: 'OK',
    endpoints: {
      auth: '/api/auth',
      connections: '/api/connections',
      metrics: '/api/metrics',
      queries: '/api/queries'
    }
  });
});

// Iniciar job de health check
startHealthCheckJob();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;