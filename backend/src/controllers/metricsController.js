const pool = require('../config/database');

// OBTENER métricas de todas las conexiones
const getMetrics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, c.nombre, c.motor, c.host
      FROM db_metrics m
      JOIN connections c ON m.db_id = c.id
      WHERE m.capture_time = (
        SELECT MAX(m2.capture_time) 
        FROM db_metrics m2 
        WHERE m2.db_id = m.db_id
      )
      ORDER BY m.capture_time DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// OBTENER historial de métricas de una conexión
const getMetricHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 60 } = req.query;

    const result = await pool.query(`
      SELECT * FROM db_metrics 
      WHERE db_id = $1 
      ORDER BY capture_time DESC 
      LIMIT $2
    `, [id, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// OBTENER resumen de salud de todas las BDs
const getHealthSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.nombre,
        c.motor,
        c.host,
        c.status,
        m.cpu,
        m.memory,
        m.connections_count,
        m.locks,
        m.deadlocks,
        m.disk_usage,
        m.health_status,
        m.capture_time
      FROM connections c
      LEFT JOIN LATERAL (
        SELECT * FROM db_metrics 
        WHERE db_id = c.id 
        ORDER BY capture_time DESC 
        LIMIT 1
      ) m ON true
      ORDER BY c.id
    `);

    const summary = {
      total: result.rows.length,
      healthy: result.rows.filter(r => r.health_status === 'HEALTHY').length,
      warning: result.rows.filter(r => r.health_status === 'WARNING').length,
      critical: result.rows.filter(r => r.health_status === 'CRITICAL').length,
      databases: result.rows
    };

    res.json(summary);
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getMetrics, getMetricHistory, getHealthSummary };