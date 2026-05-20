const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
  }
});

client.on('connect', () => {
  console.log('✅ Conectado a Redis correctamente');
});

client.on('error', (err) => {
  console.error('❌ Error conectando a Redis:', err.message);
});

client.connect().catch(console.error);

module.exports = client;