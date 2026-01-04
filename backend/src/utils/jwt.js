/*
═══════════════════════════════════════════════════════════
  E.I.O - JWT UTILITIES
  Utilitários para geração e verificação de tokens
═══════════════════════════════════════════════════════════
*/

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '30d';

/**
 * Gerar access token e refresh token
 */
async function generateTokens(user) {
    const payload = {
        sub: user.id,
        email: user.email,
        role: user.role
    };

    // Access token (curta duração)
    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY
    });

    // Refresh token (longa duração)
    const refreshToken = jwt.sign(
        {
            sub: user.id,
            tokenId: uuidv4()
        },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
}

/**
 * Verificar access token
 */
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Verificar refresh token
 */
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}

/**
 * Decodificar token sem verificar (para debugging)
 */
function decodeToken(token) {
    return jwt.decode(token);
}

module.exports = {
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken
};
