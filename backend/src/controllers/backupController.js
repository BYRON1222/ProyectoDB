const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BlobServiceClient } = require('@azure/storage-blob');

// Cliente Azure
const getAzureClient = () => {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_CONTAINER_NAME || 'backups';
  if (!connStr) return null;
  const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  return blobServiceClient.getContainerClient(containerName);
};

// Subir backup a Azure
const uploadToAzure = async (filePath, blobName) => {
  try {
    const containerClient = getAzureClient();
    if (!containerClient) return null;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadFile(filePath);
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error subiendo a Azure:', error);
    return null;
  }
};

// Calcular checksum MD5
const calculateChecksum = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
};

// Simular creación de archivo de backup
const createBackupFile = (nombre, size_mb) => {
  const backupsDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const filePath = path.join(backupsDir, `${nombre}.bak`);
  fs.writeFileSync(filePath, `BACKUP:${nombre}:${Date.now()}:SIZE:${size_mb}MB`);
  return filePath;
};

// LISTAR historial de backups
const getBackups = async (req, res) => {
  try {
    const { db_id, tipo, status } = req.query;
    let query = `
      SELECT b.*, c.nombre as db_nombre, c.motor
      FROM backup_history b
      LEFT JOIN connections c ON b.db_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (db_id) { params.push(db_id); query += ` AND b.db_id = $${params.length}`; }
    if (tipo)  { params.push(tipo);  query += ` AND b.tipo = $${params.length}`; }
    if (status){ params.push(status);query += ` AND b.status = $${params.length}`; }
    query += ' ORDER BY b.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando backups:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EJECUTAR backup
const runBackup = async (req, res) => {
  try {
    const { db_id, tipo = 'FULL', nombre } = req.body;
    if (!db_id) return res.status(400).json({ error: 'db_id es requerido' });

    const validTipos = ['FULL', 'DIFF', 'INC', 'SNAPSHOT'];
    if (!validTipos.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo inválido. Use: FULL, DIFF, INC, SNAPSHOT' });
    }

    const backupNombre = nombre || `backup_${tipo}_${Date.now()}`;
    const startTime = Date.now();

    const backupRecord = await pool.query(`
      INSERT INTO backup_history (db_id, tipo, nombre, status, rpo_minutes, rto_minutes)
      VALUES ($1, $2, $3, 'RUNNING', 15, 45)
      RETURNING id
    `, [db_id, tipo, backupNombre]);

    const backupId = backupRecord.rows[0].id;

    await new Promise(resolve => setTimeout(resolve, 1000));

    const size_mb = parseFloat((Math.random() * 500 + 50).toFixed(2));
    const filePath = createBackupFile(backupNombre, size_mb);
    const checksum = calculateChecksum(filePath);
    const duration_sec = Math.floor((Date.now() - startTime) / 1000);
    const restorePoint = new Date();

    // Subir a Azure
    const blobName = `${tipo}/${backupNombre}.bak`;
    const cloudUrl = await uploadToAzure(filePath, blobName);

    let parentId = null;
    if (tipo === 'DIFF') {
      const parent = await pool.query(`
        SELECT id FROM backup_history 
        WHERE db_id = $1 AND tipo = 'FULL' AND status = 'SUCCESS'
        ORDER BY created_at DESC LIMIT 1
      `, [db_id]);
      parentId = parent.rows[0]?.id || null;
    } else if (tipo === 'INC') {
      const parent = await pool.query(`
        SELECT id FROM backup_history
        WHERE db_id = $1 AND status = 'SUCCESS'
        ORDER BY created_at DESC LIMIT 1
      `, [db_id]);
      parentId = parent.rows[0]?.id || null;
    }

    await pool.query(`
      UPDATE backup_history SET
        status = 'SUCCESS',
        size_mb = $1,
        duration_sec = $2,
        restore_point = $3,
        local_path = $4,
        checksum_md5 = $5,
        parent_backup_id = $6,
        sla_cumplido = true,
        cloud_provider = $7,
        cloud_url = $8
      WHERE id = $9
    `, [size_mb, duration_sec, restorePoint, filePath, checksum, parentId,
        cloudUrl ? 'Azure' : null, cloudUrl, backupId]);

    const backup = await pool.query('SELECT * FROM backup_history WHERE id = $1', [backupId]);

    res.status(201).json({
      message: `✅ Backup ${tipo} completado exitosamente`,
      cloud: cloudUrl ? `☁️ Subido a Azure: ${cloudUrl}` : '⚠️ Sin replicación en nube',
      backup: backup.rows[0]
    });
  } catch (error) {
    console.error('Error ejecutando backup:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// CREAR SNAPSHOT
const createSnapshot = async (req, res) => {
  try {
    const { db_id, nombre } = req.body;
    const validSnapshots = ['PRE_DEPLOY', 'PRE_TEST', 'PRE_IMPORT'];
    if (!validSnapshots.includes(nombre)) {
      return res.status(400).json({ error: 'Nombre inválido. Use: PRE_DEPLOY, PRE_TEST, PRE_IMPORT' });
    }

    const backupNombre = `snapshot_${nombre}_${Date.now()}`;
    const size_mb = parseFloat((Math.random() * 200 + 10).toFixed(2));
    const filePath = createBackupFile(backupNombre, size_mb);
    const checksum = calculateChecksum(filePath);

    // Subir snapshot a Azure
    const blobName = `snapshots/${backupNombre}.bak`;
    const cloudUrl = await uploadToAzure(filePath, blobName);

    const result = await pool.query(`
      INSERT INTO backup_history 
        (db_id, tipo, nombre, size_mb, duration_sec, restore_point, 
         local_path, checksum_md5, status, sla_cumplido, cloud_provider, cloud_url)
      VALUES ($1, 'SNAPSHOT', $2, $3, 1, NOW(), $4, $5, 'SUCCESS', true, $6, $7)
      RETURNING *
    `, [db_id, backupNombre, size_mb, filePath, checksum,
        cloudUrl ? 'Azure' : null, cloudUrl]);

    res.status(201).json({
      message: `✅ Snapshot ${nombre} creado exitosamente`,
      cloud: cloudUrl ? `☁️ Subido a Azure: ${cloudUrl}` : '⚠️ Sin replicación en nube',
      snapshot: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando snapshot:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// SIMULAR DESASTRE y restauración
const simulateDisaster = async (req, res) => {
  try {
    const { db_id } = req.body;
    const lastBackup = await pool.query(`
      SELECT * FROM backup_history
      WHERE db_id = $1 AND status = 'SUCCESS'
      ORDER BY created_at DESC LIMIT 1
    `, [db_id]);

    if (lastBackup.rows.length === 0) {
      return res.status(404).json({ error: 'No hay backups disponibles para restaurar' });
    }

    const backup = lastBackup.rows[0];
    const disasterTime = new Date();
    const restoreStart = Date.now();

    await new Promise(resolve => setTimeout(resolve, 1500));

    const restoreTime = Date.now() - restoreStart;
    const rpo = Math.floor((disasterTime - new Date(backup.created_at)) / 60000);
    const rto = Math.floor(restoreTime / 1000 / 60) + 1;

    res.json({
      message: '✅ Restauración completada exitosamente',
      disaster_simulation: {
        evento: 'DROP TABLE accidental simulado',
        disaster_time: disasterTime,
        backup_usado: backup.nombre,
        backup_tipo: backup.tipo,
        restore_point: backup.restore_point,
        cloud_url: backup.cloud_url || 'No disponible'
      },
      sla: {
        rpo_minutes: rpo,
        rto_minutes: rto,
        rpo_objetivo: 15,
        rto_objetivo: 45,
        rpo_cumplido: rpo <= 15,
        rto_cumplido: rto <= 45
      }
    });
  } catch (error) {
    console.error('Error simulando desastre:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ESTADÍSTICAS de backups y SLA
const getBackupStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as exitosos,
        COUNT(*) FILTER (WHERE status = 'FAILED') as fallidos,
        COUNT(*) FILTER (WHERE sla_cumplido = true) as sla_cumplido,
        COUNT(*) FILTER (WHERE tipo = 'FULL') as full_backups,
        COUNT(*) FILTER (WHERE tipo = 'DIFF') as diff_backups,
        COUNT(*) FILTER (WHERE tipo = 'INC') as inc_backups,
        COUNT(*) FILTER (WHERE tipo = 'SNAPSHOT') as snapshots,
        COUNT(*) FILTER (WHERE cloud_url IS NOT NULL) as en_nube,
        AVG(size_mb)::NUMERIC(10,2) as avg_size_mb,
        AVG(duration_sec)::INTEGER as avg_duration_sec
      FROM backup_history
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo stats de backup:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { 
  getBackups, 
  runBackup, 
  createSnapshot,
  simulateDisaster,
  getBackupStats
};