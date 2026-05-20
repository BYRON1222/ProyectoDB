const pool = require('../config/database');

// OBTENER estado de replicación
const getReplicationStatus = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        p.nombre as primary_nombre,
        p.motor as primary_motor,
        rep.nombre as replica_nombre
      FROM replication_status r
      JOIN connections p ON r.primary_db_id = p.id
      JOIN connections rep ON r.replica_db_id = rep.id
      ORDER BY r.capture_time DESC
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo replicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// OBTENER lag actual
const getCurrentLag = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (primary_db_id, replica_db_id)
        r.*,
        p.nombre as primary_nombre,
        rep.nombre as replica_nombre
      FROM replication_status r
      JOIN connections p ON r.primary_db_id = p.id
      JOIN connections rep ON r.replica_db_id = rep.id
      ORDER BY primary_db_id, replica_db_id, capture_time DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo lag:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// SIMULAR replicación con 3 escenarios de carga
const simulateReplication = async (req, res) => {
  try {
    const { primary_db_id = 1, replica_db_id = 1 } = req.body;

    // 3 escenarios según el PDF
    const scenarios = [
      { nombre: 'Carga normal',  lag: 2,  estado: 'ACCEPTABLE' },
      { nombre: 'Carga media',   lag: 5,  estado: 'WARNING' },
      { nombre: 'Carga alta',    lag: 20, estado: 'CRITICAL' },
    ];

    const inserted = [];

    for (const scenario of scenarios) {
      // Agregar variación aleatoria pequeña al lag
      const lag = parseFloat((scenario.lag + (Math.random() * 0.5)).toFixed(2));

      const result = await pool.query(`
        INSERT INTO replication_status 
          (primary_db_id, replica_db_id, lag_seconds, lag_estado, bytes_pending)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        primary_db_id,
        replica_db_id,
        lag,
        scenario.estado,
        Math.floor(Math.random() * 1000000)
      ]);

      inserted.push({
        escenario: scenario.nombre,
        ...result.rows[0]
      });

      // Pausa entre escenarios
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    res.json({
      message: '✅ Simulación de replicación completada',
      teorema_cap: {
        consistencia: 'Eventual — la réplica puede tener datos ligeramente desactualizados',
        disponibilidad: 'Alta — la réplica acepta lecturas aunque haya lag',
        tolerancia_particiones: 'Sí — el sistema continúa operando ante fallas de red',
        decision: 'Este sistema prioriza AP (Disponibilidad + Tolerancia) sobre CP'
      },
      escenarios: inserted
    });
  } catch (error) {
    console.error('Error simulando replicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ESTADÍSTICAS de replicación
const getReplicationStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_mediciones,
        AVG(lag_seconds)::NUMERIC(8,2) as avg_lag_seconds,
        MAX(lag_seconds) as max_lag_seconds,
        MIN(lag_seconds) as min_lag_seconds,
        COUNT(*) FILTER (WHERE lag_estado = 'ACCEPTABLE') as acceptable,
        COUNT(*) FILTER (WHERE lag_estado = 'WARNING') as warning,
        COUNT(*) FILTER (WHERE lag_estado = 'CRITICAL') as critical
      FROM replication_status
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo stats replicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  getReplicationStatus, 
  getCurrentLag,
  simulateReplication,
  getReplicationStats
};