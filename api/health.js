/**
 * /api/health - Redirects to main API handler for full diagnostics
 * Delegates to the comprehensive health check in api/index.js
 */
const mainHandler = require('./index');

module.exports = (req, res) => {
    // Inject path so the main handler recognizes this as a health check
    req.query = req.query || {};
    req.query.path = 'health';
    return mainHandler(req, res);
};
