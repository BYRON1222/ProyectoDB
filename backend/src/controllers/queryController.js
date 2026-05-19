const pool = require('../config/database');

// Clasificar consulta según duración
const classifyQuery = (duration_ms) => {
  if (duration_ms < 100) return 'FAST';
  if (duration_ms < 500) return 'MEDIUM';
  if (duration_ms < 2000) return 'SLOW';
  return 'CRITICAL';
};

// REGISTRAR una consulta
const logQuery = async (req, res) => {
  try {
    const { db_id, query_text, duration_ms, rows_returned, index_used, execution_plan } = req.body;

    if (!query_text || !duration_ms) {
      return res.status(400).json({ error: 'query_text y duration_ms son requeridos' });
    }

    const category = classifyQuery(duration_ms);

    const result = await pool.query(`
      INSERT INTO query_log 
        (db_id, query_text, duration_ms, rows_returned, index_used, execution_plan, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      db_id || null,
      query_text,
      duration_ms,
      rows_returned || 0,
      index_used || null,
      execution_plan ? JSON.stringify(execution_plan) : null,
      category
    ]);

    res.status(201).json({
      message: '✅ Query registrada',
      query: result.rows[0]
    });
  } catch (error) {
    console.error('Error registrando query:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// LISTAR todas las queries con filtros
const getQueries = async (req, res) => {
  try {
    const { category, db_id, limit = 50 } = req.query;

    let query = `
      SELECT q.*, c.nombre as db_nombre, c.motor
      FROM query_log q
      LEFT JOIN connections c ON q.db_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND q.category = $${params.length}`;
    }

    if (db_id) {
      params.push(db_id);
      query += ` AND q.db_id = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY q.duration_ms DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando queries:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// TOP 10 queries más lentas
const getTopSlowQueries = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.id,
        q.query_text,
        q.duration_ms,
        q.rows_returned,
        q.index_used,
        q.category,
        q.created_at,
        c.nombre as db_nombre,
        c.motor
      FROM query_log q
      LEFT JOIN connections c ON q.db_id = c.id
      ORDER BY q.duration_ms DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo top queries:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ESTADÍSTICAS de queries por categoría
const getQueryStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total,
        AVG(duration_ms)::INTEGER as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MIN(duration_ms) as min_duration_ms
      FROM query_log
      GROUP BY category
      ORDER BY 
        CASE category
          WHEN 'CRITICAL' THEN 1
          WHEN 'SLOW'     THEN 2
          WHEN 'MEDIUM'   THEN 3
          WHEN 'FAST'     THEN 4
        END
    `);

    const total = await pool.query('SELECT COUNT(*) as total FROM query_log');

    res.json({
      total: parseInt(total.rows[0].total),
      by_category: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// SIMULAR queries para demostración
const simulateQueries = async (req, res) => {
  try {
    const { db_id = 1, count = 20 } = req.body;

    const sampleQueries = [
      { text: 'SELECT * FROM users WHERE id = 1', min: 10, max: 80 },
      { text: 'SELECT * FROM connections ORDER BY created_at DESC', min: 50, max: 300 },
      { text: 'SELECT COUNT(*) FROM db_metrics WHERE capture_time > NOW() - INTERVAL \'1 hour\'', min: 200, max: 800 },
      { text: 'SELECT * FROM query_log WHERE duration_ms > 500 ORDER BY duration_ms DESC', min: 500, max: 2500 },
      { text: 'UPDATE connections SET status = \'ACTIVE\' WHERE id IN (SELECT id FROM connections)', min: 1000, max: 5000 },
      { text: 'SELECT m.*, c.nombre FROM db_metrics m JOIN connections c ON m.db_id = c.id', min: 100, max: 600 },
    ];

    const inserted = [];
    for (let i = 0; i < count; i++) {
      const sample = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      const duration_ms = Math.floor(Math.random() * (sample.max - sample.min) + sample.min);
      const category = classifyQuery(duration_ms);

      const result = await pool.query(`
        INSERT INTO query_log (db_id, query_text, duration_ms, rows_returned, index_used, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, duration_ms, category
      `, [
        db_id,
        sample.text,
        duration_ms,
        Math.floor(Math.random() * 1000),
        Math.random() > 0.5 ? 'idx_primary' : null,
        category
      ]);

      inserted.push(result.rows[0]);
    }

    res.json({
      message: `✅ ${count} queries simuladas correctamente`,
      queries: inserted
    });
  } catch (error) {
    console.error('Error simulando queries:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { logQuery, getQueries, getTopSlowQueries, getQueryStats, simulateQueries };