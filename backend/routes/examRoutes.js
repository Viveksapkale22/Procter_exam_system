const express = require('express');
const {
  getExams,
  createExam,
  startExamSession,
  toggleExamLock,
} = require('../controllers/examController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getExams);
router.post('/create', protect, requireAdmin, createExam);
router.get('/:examId/start', protect, startExamSession);
router.patch('/:examId/toggle-lock', protect, requireAdmin, toggleExamLock);

module.exports = router;
