-- ═══════════════════════════════════════════════════════════
-- DATAOPS CONTROL CENTER — Schema de Base de Datos
-- PostgreSQL 16
-- ═══════════════════════════════════════════════════════════

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- MÓDULO 0: USUARIOS DEL SISTEMA
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50)  UNIQUE NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    -- Las contraseñas se guardan con bcrypt, NUNCA en texto plano
    password_hash VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin', 'operator', 'viewer')),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MÓDULO 1: REGISTRO DE MOTORES (CONNECTIONS)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    motor           VARCHAR(20)  NOT NULL
                    CHECK (motor IN ('Oracle', 'SQLServer', 'PostgreSQL', 'MySQL')),
    host            VARCHAR(255) NOT NULL,
    port            INTEGER      NOT NULL,
    database_name   VARCHAR(100) NOT NULL,
    user_name       VARCHAR(100) NOT NULL,
    -- La contraseña se encripta con pgcrypto antes de guardar
    password_encrypted TEXT      NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MÓDULO 2: MÉTRICAS DE SALUD (DB_METRICS)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS db_metrics (
    id              SERIAL PRIMARY KEY,
    db_id           INTEGER      NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    cpu             NUMERIC(5,2) DEFAULT 0,        -- % uso CPU
    memory          NUMERIC(5,2) DEFAULT 0,        -- % uso RAM
    connections_count INTEGER    DEFAULT 0,        -- conexiones activas
    locks           INTEGER      DEFAULT 0,        -- bloqueos activos
    deadlocks       INTEGER      DEFAULT 0,        -- interbloqueos detectados
    disk_usage      NUMERIC(10,2) DEFAULT 0,       -- MB usados en disco
    health_status   VARCHAR(10)  NOT NULL DEFAULT 'HEALTHY'
                    CHECK (health_status IN ('HEALTHY', 'WARNING', 'CRITICAL')),
    capture_time    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas rápidas por base de datos y tiempo
CREATE INDEX IF NOT EXISTS idx_db_metrics_db_id_time
    ON db_metrics(db_id, capture_time DESC);

-- ─────────────────────────────────────────
-- MÓDULO 3: SLOW QUERY ANALYZER (QUERY_LOG)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS query_log (
    id              SERIAL PRIMARY KEY,
    db_id           INTEGER      REFERENCES connections(id) ON DELETE SET NULL,
    query_text      TEXT         NOT NULL,
    duration_ms     INTEGER      NOT NULL,          -- duración en milisegundos
    rows_returned   INTEGER      DEFAULT 0,
    index_used      VARCHAR(255) DEFAULT NULL,      -- NULL si no usó índice
    execution_plan  JSONB        DEFAULT NULL,      -- plan de ejecución serializado
    category        VARCHAR(10)  NOT NULL DEFAULT 'FAST'
                    CHECK (category IN ('FAST', 'MEDIUM', 'SLOW', 'CRITICAL')),
    -- FAST < 100ms | MEDIUM 100-500ms | SLOW 500-2000ms | CRITICAL > 2000ms
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_log_duration
    ON query_log(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_query_log_db_id
    ON query_log(db_id, created_at DESC);

-- ─────────────────────────────────────────
-- MÓDULO 4: CONCURRENCIA (TX_LOG)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tx_log (
    id              SERIAL PRIMARY KEY,
    db_id           INTEGER      REFERENCES connections(id) ON DELETE SET NULL,
    session_id      VARCHAR(100) NOT NULL,          -- identificador de sesión
    operacion       VARCHAR(10)  NOT NULL
                    CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    inicio          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fin             TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    wait_time_ms    INTEGER      DEFAULT 0,         -- tiempo de espera en ms
    lock_type       VARCHAR(20)  NOT NULL DEFAULT 'SHARED'
                    CHECK (lock_type IN ('SHARED', 'EXCLUSIVE', 'DEADLOCK', 'TIMEOUT')),
    resolved        BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_log_deadlocks
    ON tx_log(lock_type) WHERE lock_type = 'DEADLOCK';

-- ─────────────────────────────────────────
-- MÓDULO 5: BACKUP & RECOVERY (BACKUP_HISTORY)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backup_history (
    id              SERIAL PRIMARY KEY,
    db_id           INTEGER      NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    tipo            VARCHAR(10)  NOT NULL
                    CHECK (tipo IN ('FULL', 'DIFF', 'INC', 'SNAPSHOT')),
    nombre          VARCHAR(255) NOT NULL,          -- nombre del archivo de backup
    size_mb         NUMERIC(10,2) DEFAULT 0,        -- tamaño en MB
    duration_sec    INTEGER      DEFAULT 0,         -- duración de la operación
    restore_point   TIMESTAMP WITH TIME ZONE,       -- punto de restauración
    parent_backup_id INTEGER     REFERENCES backup_history(id), -- para DIFF e INC
    -- Almacenamiento local
    local_path      TEXT         DEFAULT NULL,
    -- Almacenamiento en nube
    cloud_provider  VARCHAR(10)  DEFAULT NULL
                    CHECK (cloud_provider IN ('AWS', 'Azure', NULL)),
    cloud_url       TEXT         DEFAULT NULL,      -- URL remota del backup
    checksum_md5    VARCHAR(32)  DEFAULT NULL,      -- integridad del archivo
    checksum_sha256 VARCHAR(64)  DEFAULT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED')),
    -- SLA
    rpo_minutes     INTEGER      DEFAULT 15,        -- Recovery Point Objective
    rto_minutes     INTEGER      DEFAULT 45,        -- Recovery Time Objective
    sla_cumplido    BOOLEAN      DEFAULT NULL,
    error_message   TEXT         DEFAULT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_history_db_id
    ON backup_history(db_id, created_at DESC);

-- ─────────────────────────────────────────
-- MÓDULO 6: REPLICACIÓN (REPLICATION_STATUS)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS replication_status (
    id              SERIAL PRIMARY KEY,
    primary_db_id   INTEGER      NOT NULL REFERENCES connections(id),
    replica_db_id   INTEGER      NOT NULL REFERENCES connections(id),
    lag_seconds     NUMERIC(8,2) DEFAULT 0,         -- lag de replicación
    lag_estado      VARCHAR(15)  NOT NULL DEFAULT 'ACCEPTABLE'
                    CHECK (lag_estado IN ('ACCEPTABLE', 'WARNING', 'CRITICAL')),
    -- ACCEPTABLE ≤ 2s | WARNING ≤ 5s | CRITICAL > 10s
    bytes_pending   BIGINT       DEFAULT 0,
    capture_time    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MÓDULO 7: CACHÉ REDIS (CACHE_METRICS)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cache_metrics (
    id              SERIAL PRIMARY KEY,
    cache_key       VARCHAR(500) NOT NULL,
    hit             BOOLEAN      NOT NULL,          -- TRUE=hit, FALSE=miss
    response_time_ms INTEGER     NOT NULL,          -- tiempo de respuesta
    ttl_seconds     INTEGER      DEFAULT NULL,      -- tiempo de vida de la clave
    capture_time    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- MÓDULO 9: MOTOR DE ALERTAS (ALERT_LOG)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_log (
    id              SERIAL PRIMARY KEY,
    db_id           INTEGER      REFERENCES connections(id) ON DELETE SET NULL,
    condicion       VARCHAR(100) NOT NULL,          -- ej: "CPU > 85%"
    valor_actual    VARCHAR(100) NOT NULL,          -- ej: "92%"
    severidad       VARCHAR(10)  NOT NULL
                    CHECK (severidad IN ('WARNING', 'CRITICAL', 'INFO')),
    accion_tomada   VARCHAR(100) DEFAULT NULL,      -- ej: "Correo enviado"
    estado          VARCHAR(20)  NOT NULL DEFAULT 'OPEN'
                    CHECK (estado IN ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
    notificacion_enviada BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at     TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_log_estado
    ON alert_log(estado, created_at DESC);

-- ─────────────────────────────────────────
-- REGLAS DE ALERTA (configurables sin redeploy)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_rules (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    metrica         VARCHAR(50)  NOT NULL,          -- ej: "cpu", "deadlocks", "disk_usage"
    operador        VARCHAR(5)   NOT NULL
                    CHECK (operador IN ('>', '<', '>=', '<=', '=')),
    umbral          NUMERIC(10,2) NOT NULL,         -- valor límite
    severidad       VARCHAR(10)  NOT NULL
                    CHECK (severidad IN ('WARNING', 'CRITICAL', 'INFO')),
    accion          VARCHAR(50)  NOT NULL,          -- EMAIL, DASHBOARD, BOTH
    activa          BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reglas por defecto según el enunciado
INSERT INTO alert_rules (nombre, metrica, operador, umbral, severidad, accion) VALUES
    ('CPU Alta',              'cpu',          '>',  85,  'WARNING',  'EMAIL'),
    ('Deadlocks Críticos',    'deadlocks',    '>',  3,   'CRITICAL', 'DASHBOARD'),
    ('Backup Fallido',        'backup_fail',  '=',  1,   'CRITICAL', 'BOTH'),
    ('Lag Replicación Alto',  'lag_seconds',  '>',  10,  'WARNING',  'DASHBOARD'),
    ('Disco Lleno',           'disk_usage',   '>',  90,  'CRITICAL', 'BOTH'),
    ('Conexiones Excesivas',  'connections_count', '>', 100, 'WARNING', 'DASHBOARD')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- USUARIO ADMIN POR DEFECTO
-- Contraseña: Admin123! (hasheada con bcrypt)
-- ─────────────────────────────────────────
INSERT INTO users (username, email, password_hash, role) VALUES
    ('admin', 'admin@dataops.local',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS7mXK6',
     'admin')
ON CONFLICT DO NOTHING;
