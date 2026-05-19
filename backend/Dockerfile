# ─────────────────────────────────────────
# BACKEND — Node.js 20 (LTS)
# ─────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache python3 make g++

# Copiar package.json primero (para aprovechar cache de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

EXPOSE 4000

# En desarrollo usamos nodemon para hot-reload
CMD ["npm", "run", "dev"]
