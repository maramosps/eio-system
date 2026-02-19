// Test loading api/index.js directly
let loadResult = 'unknown';
let loadError = null;

try {
    const handler = require('./index.js');
    loadResult = typeof handler === 'function' ? 'OK_FUNCTION' : 'LOADED_BUT_NOT_FUNCTION: ' + typeof handler;
} catch (e) {
    loadResult = 'CRASH';
    loadError = {
        name: e.name,
        message: e.message,
        stack: e.stack ? e.stack.split('\n').slice(0, 10).join('\n') : null
    };
}

module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
        probe: 'INDEX_LOAD_TEST',
        loadResult,
        loadError
    });
};
