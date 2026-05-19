const pool = require('../config/database');

// Función que determina el estado según umbrales
const getHealthStatus = (cpu, memory, connections, deadlocks) => {
  if (cpu > 85 || memory > 90 || deadlocks > 3) return 'CRITICAL';
  if (cpu > 70 || memory > 75 || connections > 80) return 'WARNING';
  return 'HEALTHY';
};

// Simula métricas reales
const simulateMetrics = () => ({
  cpu: parseFloat((Math.random() * 100).toFixed(2)),
  memory: parseFloat((Math.random() * 100).toFixed(2)),
  connections_count: Math.floor(Math.random() * 150),
  locks: Math.floor(Math.random() * 10),
  deadlocks: Math.floor(Math.random() * 5),
  disk_usage: parseFloat((Math.random() * 1000).toFixed(2))
});

// Ejecutar health check
const runHealthCheck = async () => {
  try {
    const connections = await pool.query(
      "SELECT id FROM connections WHERE status = 'ACTIVE'"
    );

    if (connections.rows.length === 0) return;

    for (const conn of connections.rows) {
      const metrics = simulateMetrics();
      const health_status = getHealthStatus(
        metrics.cpu,
        metrics.memory,
        metrics.connections_count,
        metrics.deadlocks
      );

      await pool.query(`
        INSERT INTO db_metrics 
          (db_id, cpu, memory, connections_count, locks, deadlocks, disk_usage, health_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        conn.id,
        metrics.cpu,
        metrics.memory,
        metrics.connections_count,
        metrics.locks,
        metrics.deadlocks,
        metrics.disk_usage,
        health_status
      ]);

      console.log(`📊 [DB ${conn.id}] ${health_status} | CPU: ${metrics.cpu}% | RAM: ${metrics.memory}%`);
    }
  } catch (error) {
    console.error('❌ Error en health check:', error.message);
  }
};

// Usar setInterval en lugar de node-cron (más estable en Docker)
const startHealthCheckJob = () => {
  console.log('✅ Health Check Job iniciado — ejecuta cada 60 segundos');
  runHealthCheck(); // Ejecutar inmediatamente al iniciar
  setInterval(runHealthCheck, 60000); // Luego cada 60 segundos
};

module.exports = { startHealthCheckJob };