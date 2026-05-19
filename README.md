# 🖥️ DataOps Control Center

Plataforma centralizada de monitoreo, gestión y recuperación de bases de datos empresariales.

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js 20 + Express |
| Base de datos | PostgreSQL 16 |
| Caché | Redis 7 |
| Monitoreo | Prometheus + Grafana |
| Contenedores | Docker + Docker Compose |

## 📁 Estructura del Proyecto

```
dataops-control-center/
├── docker-compose.yml        # Orquestación de servicios
├── .env.example              # Variables de entorno (plantilla)
├── .gitignore
│
├── backend/                  # API Node.js + Express
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Punto de entrada
│   │   ├── config/           # Configuración DB, Redis, JWT
│   │   ├── routes/           # Rutas de la API
│   │   ├── controllers/      # Lógica de negocio
│   │   ├── models/           # Modelos de datos
│   │   ├── middleware/        # Auth JWT, validaciones
│   │   ├── services/         # Servicios (backup, alertas, caché)
│   │   └── jobs/             # Tareas programadas (health check)
│   └── backups/              # Carpeta local de backups
│
├── frontend/                 # React 18
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── pages/            # Páginas principales
│       ├── components/       # Componentes reutilizables
│       ├── services/         # Llamadas a la API
│       └── hooks/            # Custom hooks
│
├── database/
│   └── init.sql              # Schema completo de la BD
│
└── monitoring/
    ├── prometheus.yml         # Configuración Prometheus
    └── grafana/
        └── provisioning/     # Dashboards Grafana
```

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Docker Desktop instalado y corriendo
- Git

### Pasos

**1. Clonar el repositorio**
```bash
git clone <url-del-repo>
cd dataops-control-center
```

**2. Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores reales
```

**3. Levantar toda la plataforma**
```bash
docker compose up -d
```

**4. Verificar que todo corra**
```bash
docker compose ps
```

### URLs de acceso

| Servicio | URL |
|---------|-----|
| 🖥️ Frontend | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:4000/api |
| 📖 Swagger Docs | http://localhost:4000/api/docs |
| 📊 Grafana | http://localhost:3001 |
| 📈 Prometheus | http://localhost:9090 |

### Credenciales por defecto

| Servicio | Usuario | Contraseña |
|---------|---------|-----------|
| App | admin | Admin123! |
| Grafana | admin | admin123 |

## 📦 Módulos Implementados

- [x] Módulo 1: Registro de motores de BD
- [x] Módulo 2: Health Check automático
- [x] Módulo 3: Slow Query Analyzer
- [x] Módulo 4: Concurrencia y deadlocks
- [x] Módulo 5: Backup, Recovery y nube
- [x] Módulo 6: Replicación distribuida
- [x] Módulo 7: Caché con Redis
- [x] Módulo 8: Dashboard BI
- [x] Módulo 9: Motor de alertas

## 🛑 Detener la plataforma

```bash
docker compose down
```

Para eliminar también los datos:
```bash
docker compose down -v
```
