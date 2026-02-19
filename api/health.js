module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ heartbeat: 'LIVE', version: '4.6.5' });
};
