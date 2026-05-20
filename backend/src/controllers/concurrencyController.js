const pool = require('../config/database');

// LISTAR transacciones
const getTransactions = async (req, res) => {
  try {
    const { lock_type, db_id, limit = 50 } = req.query;

    let query = `
      SELECT t.*, c.nombre as db_nombre
      FROM tx_log t
      LEFT JOIN connections c ON t.db_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (lock_type) {
      params.push(lock_type);
      query += ` AND t.lock_type = $${params.length}`;
    }
    if (db_id) {
      params.push(db_id);
      query += ` AND t.db_id = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando transacciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ESTADÍSTICAS de concurrencia
const getConcurrencyStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE lock_type = 'DEADLOCK') as total_deadlocks,
        COUNT(*) FILTER (WHERE lock_type = 'TIMEOUT') as total_timeouts,
        COUNT(*) FILTER (WHERE lock_type = 'SHARED') as total_shared,
        COUNT(*) FILTER (WHERE lock_type = 'EXCLUSIVE') as total_exclusive,
        AVG(wait_time_ms)::INTEGER as avg_wait_time_ms,
        MAX(wait_time_ms) as max_wait_time_ms,
        COUNT(*) FILTER (WHERE resolved = false) as unresolved
      FROM tx_log
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// SIMULAR concurrencia con 100 usuarios
const simulateConcurrency = async (req, res) => {
  try {
    const { db_id = 1, users = 100 } = req.body;

    const operations = ['INSERT', 'UPDATE', 'DELETE', 'SELECT'];
    const lockTypes = ['SHARED', 'SHARED', 'SHARED', 'EXCLUSIVE', 'EXCLUSIVE', 'DEADLOCK', 'TIMEOUT'];

    const inserted = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < users; i++) {
        const session_id = `session_${Date.now()}_${i}`;
        const operacion = operations[Math.floor(Math.random() * operations.length)];
        const lock_type = lockTypes[Math.floor(Math.random() * lockTypes.length)];
        const wait_time_ms = Math.floor(Math.random() * 2000);
        const inicio = new Date();
        const fin = new Date(inicio.getTime() + wait_time_ms);
        const resolved = lock_type !== 'DEADLOCK';

        const result = await client.query(`
          INSERT INTO tx_log 
            (db_id, session_id, operacion, inicio, fin, wait_time_ms, lock_type, resolved)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, session_id, operacion, lock_type, wait_time_ms, resolved
        `, [db_id, session_id, operacion, inicio, fin, wait_time_ms, lock_type, resolved]);

        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Contar deadlocks detectados
    const deadlocks = inserted.filter(t => t.lock_type === 'DEADLOCK');
    const timeouts = inserted.filter(t => t.lock_type === 'TIMEOUT');

    res.json({
      message: `✅ Simulación completada con ${users} usuarios concurrentes`,
      summary: {
        total: inserted.length,
        deadlocks_detected: deadlocks.length,
        timeouts: timeouts.length,
        resolved: inserted.filter(t => t.resolved).length,
        unresolved: inserted.filter(t => !t.resolved).length
      }
    });
  } catch (error) {
    console.error('Error simulando concurrencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// RESOLVER deadlocks pendientes
const resolveDeadlocks = async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE tx_log 
      SET resolved = true
      WHERE lock_type = 'DEADLOCK' AND resolved = false
      RETURNING id, session_id, lock_type
    `);

    res.json({
      message: `✅ ${result.rows.length} deadlocks resueltos`,
      resolved: result.rows
    });
  } catch (error) {
    console.error('Error resolviendo deadlocks:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  getTransactions, 
  getConcurrencyStats, 
  simulateConcurrency,
  resolveDeadlocks
};