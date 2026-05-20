const pool = require('../config/database');
const redisClient = require('../config/redis');

// Tiempo de vida del caché en segundos
const CACHE_TTL = 60;

// CONSULTA con caché — demuestra hit vs miss
const getCachedQuery = async (req, res) => {
  try {
    const { key } = req.params;
    const cacheKey = `query:${key}`;
    const startTime = Date.now();

    // Intentar obtener del caché
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      // CACHE HIT
      const responseTime = Date.now() - startTime;

      await pool.query(`
        INSERT INTO cache_metrics (cache_key, hit, response_time_ms, ttl_seconds)
        VALUES ($1, true, $2, $3)
      `, [cacheKey, responseTime, CACHE_TTL]);

      return res.json({
        source: 'CACHE HIT 🎯',
        response_time_ms: responseTime,
        data: JSON.parse(cached)
      });
    }

    // CACHE MISS — consultar la BD
    await new Promise(resolve => setTimeout(resolve, 400));
    const dbStart = Date.now();

    const result = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM db_metrics WHERE db_id = c.id) as total_metrics
      FROM connections c
      WHERE c.id = $1
    `, [key]);

    const dbResponseTime = Date.now() - dbStart;
    const totalResponseTime = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }

    // Guardar en caché
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result.rows[0]));

    await pool.query(`
      INSERT INTO cache_metrics (cache_key, hit, response_time_ms, ttl_seconds)
      VALUES ($1, false, $2, $3)
    `, [cacheKey, totalResponseTime, CACHE_TTL]);

    res.json({
      source: 'CACHE MISS ❌ → guardado en caché',
      response_time_ms: totalResponseTime,
      db_response_time_ms: dbResponseTime,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error en caché:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// COMPARATIVA sin caché vs con caché
const comparePerformance = async (req, res) => {
  try {
    const { db_id = 1 } = req.body;
    const cacheKey = `perf:${db_id}`;

    // --- SIN CACHÉ ---
    const noCacheStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 400));
    await pool.query('SELECT * FROM connections WHERE id = $1', [db_id]);
    const noCacheTime = Date.now() - noCacheStart;

    // Guardar en caché
    const data = { db_id, timestamp: Date.now() };
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));

    // --- CON CACHÉ ---
    const cacheStart = Date.now();
    await redisClient.get(cacheKey);
    const cacheTime = Date.now() - cacheStart;

    const improvement = ((noCacheTime - cacheTime) / noCacheTime * 100).toFixed(1);

    // Registrar métricas
    await pool.query(`
      INSERT INTO cache_metrics (cache_key, hit, response_time_ms, ttl_seconds)
      VALUES ($1, false, $2, $3), ($1, true, $4, $3)
    `, [cacheKey, noCacheTime, CACHE_TTL, cacheTime]);

    res.json({
      message: '✅ Comparativa de rendimiento completada',
      comparativa: {
        sin_cache_ms: noCacheTime,
        con_cache_ms: cacheTime,
        mejora_porcentaje: `${improvement}%`,
        factor_mejora: `${(noCacheTime / cacheTime).toFixed(1)}x más rápido`
      },
      ttl_seconds: CACHE_TTL
    });
  } catch (error) {
    console.error('Error en comparativa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ESTADÍSTICAS del caché (hit ratio)
const getCacheStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE hit = true) as hits,
        COUNT(*) FILTER (WHERE hit = false) as misses,
        ROUND(
          COUNT(*) FILTER (WHERE hit = true)::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 2
        ) as hit_ratio_percent,
        AVG(response_time_ms) FILTER (WHERE hit = true)::INTEGER as avg_hit_time_ms,
        AVG(response_time_ms) FILTER (WHERE hit = false)::INTEGER as avg_miss_time_ms
      FROM cache_metrics
    `);

    // Información del Redis
    const redisInfo = await redisClient.info('memory');
    const memoryMatch = redisInfo.match(/used_memory_human:(.+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'N/A';

    res.json({
      ...result.rows[0],
      redis_memory_used: memoryUsed,
      ttl_default_seconds: CACHE_TTL
    });
  } catch (error) {
    console.error('Error obteniendo stats caché:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// INVALIDAR caché manualmente
const invalidateCache = async (req, res) => {
  try {
    const { pattern = '*' } = req.body;

    const keys = await redisClient.keys(pattern);

    if (keys.length === 0) {
      return res.json({ message: 'No hay claves que invalidar', deleted: 0 });
    }

    await redisClient.del(keys);

    res.json({
      message: `✅ Caché invalidado correctamente`,
      deleted_keys: keys.length,
      keys
    });
  } catch (error) {
    console.error('Error invalidando caché:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  getCachedQuery, 
  comparePerformance,
  getCacheStats,
  invalidateCache
};