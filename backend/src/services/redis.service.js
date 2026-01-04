/*
═══════════════════════════════════════════════════════════
  E.I.O - REDIS SERVICE
  Serviço de cache e sessões com Redis
═══════════════════════════════════════════════════════════
*/

const redis = require('redis');

let redisClient;

/**
 * Inicializar conexão com Redis
 */
async function initializeRedis() {
    try {
        redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 1) return false; // Stop retrying after 1 failed attempt
                    return 500;
                }
            }
        });

        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            console.log('✓ Redis connected');
        });

        await redisClient.connect();

        return redisClient;
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
    }
}

/**
 * Obter valor do cache
 */
async function get(key) {
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Redis GET error:', error);
        return null;
    }
}

/**
 * Definir valor no cache
 */
async function set(key, value, expirationSeconds = 3600) {
    try {
        await redisClient.setEx(key, expirationSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Redis SET error:', error);
        return false;
    }
}

/**
 * Deletar chave
 */
async function del(key) {
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error('Redis DEL error:', error);
        return false;
    }
}

/**
 * Verificar se chave existe
 */
async function exists(key) {
    try {
        const result = await redisClient.exists(key);
        return result === 1;
    } catch (error) {
        console.error('Redis EXISTS error:', error);
        return false;
    }
}

/**
 * Incrementar contador
 */
async function incr(key) {
    try {
        return await redisClient.incr(key);
    } catch (error) {
        console.error('Redis INCR error:', error);
        return null;
    }
}

/**
 * Adicionar item a uma lista
 */
async function pushToList(key, value) {
    try {
        await redisClient.rPush(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Redis RPUSH error:', error);
        return false;
    }
}

/**
 * Obter todos os itens de uma lista
 */
async function getList(key) {
    try {
        const list = await redisClient.lRange(key, 0, -1);
        return list.map(item => JSON.parse(item));
    } catch (error) {
        console.error('Redis LRANGE error:', error);
        return [];
    }
}

/**
 * Fechar conexão
 */
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        console.log('✓ Redis connection closed');
    }
}

module.exports = {
    initializeRedis,
    closeRedis,
    get,
    set,
    del,
    exists,
    incr,
    pushToList,
    getList,
    getClient: () => redisClient
};
