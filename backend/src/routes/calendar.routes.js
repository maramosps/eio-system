const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');

router.get('/', calendarController.getScheduledContent);
router.post('/', calendarController.createScheduledContent);
router.get('/:date/content', calendarController.getContentByDate);
router.put('/:id', calendarController.updateScheduledContent);
router.delete('/:id', calendarController.deleteScheduledContent);
router.get('/export', calendarController.exportCalendar);

module.exports = router;
