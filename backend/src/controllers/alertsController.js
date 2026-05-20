const pool = require('../config/database');

// LISTAR alertas
const getAlerts = async (req, res) => {
  try {
    const { estado, severidad, limit = 50 } = req.query;

    let query = `
      SELECT a.*, c.nombre as db_nombre, c.motor
      FROM alert_log a
      LEFT JOIN connections c ON a.db_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (estado) { params.push(estado); query += ` AND a.estado = $${params.length}`; }
    if (severidad) { params.push(severidad); query += ` AND a.severidad = $${params.length}`; }

    params.push(limit);
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// LISTAR reglas de alerta
const getAlertRules = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM alert_rules ORDER BY severidad, nombre'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando reglas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// CREAR regla de alerta
const createAlertRule = async (req, res) => {
  try {
    const { nombre, metrica, operador, umbral, severidad, accion } = req.body;

    if (!nombre || !metrica || !operador || !umbral || !severidad || !accion) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const result = await pool.query(`
      INSERT INTO alert_rules (nombre, metrica, operador, umbral, severidad, accion)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [nombre, metrica, operador, umbral, severidad, accion]);

    res.status(201).json({
      message: '✅ Regla creada correctamente',
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando regla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ACTUALIZAR regla (activar/desactivar sin redeploy)
const updateAlertRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { activa, umbral, accion } = req.body;

    const result = await pool.query(`
      UPDATE alert_rules SET
        activa = COALESCE($1, activa),
        umbral = COALESCE($2, umbral),
        accion = COALESCE($3, accion)
      WHERE id = $4
      RETURNING *
    `, [activa, umbral, accion, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }

    res.json({
      message: '✅ Regla actualizada sin necesidad de redeploy',
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando regla:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EVALUAR alertas contra métricas actuales
const evaluateAlerts = async (req, res) => {
  try {
    // Obtener últimas métricas
    const metrics = await pool.query(`
      SELECT DISTINCT ON (db_id) *
      FROM db_metrics
      ORDER BY db_id, capture_time DESC
    `);

    // Obtener reglas activas
    const rules = await pool.query(
      'SELECT * FROM alert_rules WHERE activa = true'
    );

    const alertsGenerated = [];

    for (const metric of metrics.rows) {
      for (const rule of rules.rows) {
        let valor = null;

        // Obtener valor de la métrica
        switch (rule.metrica) {
          case 'cpu':               valor = parseFloat(metric.cpu); break;
          case 'memory':            valor = parseFloat(metric.memory); break;
          case 'connections_count': valor = metric.connections_count; break;
          case 'deadlocks':         valor = metric.deadlocks; break;
          case 'disk_usage':        valor = parseFloat(metric.disk_usage); break;
          default: continue;
        }

        if (valor === null) continue;

        // Evaluar condición
        let condicionCumplida = false;
        switch (rule.operador) {
          case '>':  condicionCumplida = valor > rule.umbral; break;
          case '<':  condicionCumplida = valor < rule.umbral; break;
          case '>=': condicionCumplida = valor >= rule.umbral; break;
          case '<=': condicionCumplida = valor <= rule.umbral; break;
          case '=':  condicionCumplida = valor == rule.umbral; break;
        }

        if (condicionCumplida) {
          // Registrar alerta
          const alert = await pool.query(`
            INSERT INTO alert_log 
              (db_id, condicion, valor_actual, severidad, accion_tomada, estado)
            VALUES ($1, $2, $3, $4, $5, 'OPEN')
            RETURNING *
          `, [
            metric.db_id,
            `${rule.metrica} ${rule.operador} ${rule.umbral}`,
            `${valor}`,
            rule.severidad,
            rule.accion
          ]);

          alertsGenerated.push({
            regla: rule.nombre,
            db_id: metric.db_id,
            condicion: `${rule.metrica} ${rule.operador} ${rule.umbral}`,
            valor_actual: valor,
            severidad: rule.severidad,
            accion: rule.accion
          });
        }
      }
    }

    res.json({
      message: `✅ Evaluación completada — ${alertsGenerated.length} alertas generadas`,
      alertas_generadas: alertsGenerated
    });
  } catch (error) {
    console.error('Error evaluando alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// RESOLVER alerta
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE alert_log SET
        estado = 'RESOLVED',
        resolved_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    res.json({
      message: '✅ Alerta resuelta',
      alert: result.rows[0]
    });
  } catch (error) {
    console.error('Error resolviendo alerta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ESTADÍSTICAS de alertas
const getAlertStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'OPEN') as abiertas,
        COUNT(*) FILTER (WHERE estado = 'RESOLVED') as resueltas,
        COUNT(*) FILTER (WHERE severidad = 'CRITICAL') as criticas,
        COUNT(*) FILTER (WHERE severidad = 'WARNING') as warnings,
        COUNT(*) FILTER (WHERE severidad = 'INFO') as info
      FROM alert_log
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo stats alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAlerts,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  evaluateAlerts,
  resolveAlert,
  getAlertStats
};