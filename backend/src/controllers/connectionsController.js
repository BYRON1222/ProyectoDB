const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// LISTAR todas las conexiones
const getConnections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, motor, host, port, database_name, 
              user_name, status, created_at 
       FROM connections ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listando conexiones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// OBTENER una conexión por ID
const getConnectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, nombre, motor, host, port, database_name,
              user_name, status, created_at
       FROM connections WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo conexión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// CREAR nueva conexión
const createConnection = async (req, res) => {
  try {
    const { nombre, motor, host, port, database_name, user_name, password } = req.body;

    if (!nombre || !motor || !host || !port || !database_name || !user_name || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Encriptar la contraseña antes de guardar
    const password_encrypted = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO connections 
        (nombre, motor, host, port, database_name, user_name, password_encrypted, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       RETURNING id, nombre, motor, host, port, database_name, user_name, status, created_at`,
      [nombre, motor, host, port, database_name, user_name, password_encrypted]
    );

    res.status(201).json({
      message: '✅ Conexión registrada correctamente',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando conexión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ACTUALIZAR estado de una conexión
const updateConnectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'ERROR'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const result = await pool.query(
      `UPDATE connections SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, nombre, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }

    res.json({
      message: '✅ Estado actualizado',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando conexión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ELIMINAR una conexión
const deleteConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM connections WHERE id = $1 RETURNING id, nombre',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conexión no encontrada' });
    }

    res.json({ message: '✅ Conexión eliminada', connection: result.rows[0] });
  } catch (error) {
    console.error('Error eliminando conexión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getConnections,
  getConnectionById,
  createConnection,
  updateConnectionStatus,
  deleteConnection
};