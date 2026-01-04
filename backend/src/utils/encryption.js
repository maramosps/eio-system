/*
═══════════════════════════════════════════════════════════
  E.I.O - ENCRYPTION UTILITIES
  Utilitários para criptografia de dados sensíveis
═══════════════════════════════════════════════════════════
*/

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

/**
 * Criptografar texto
 */
function encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Descriptografar texto
 */
function decrypt(text) {
    if (!text) return null;

    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

/**
 * Gerar hash (para senhas, use bcrypt)
 */
function hash(text) {
    return crypto
        .createHash('sha256')
        .update(text)
        .digest('hex');
}

/**
 * Gerar token aleatório
 */
function generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

module.exports = {
    encrypt,
    decrypt,
    hash,
    generateRandomToken
};
