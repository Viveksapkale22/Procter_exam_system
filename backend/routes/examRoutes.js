const express = require('express');
const {
  getExams,
  createExam,
  startExamSession,
  toggleLock,
  deleteExam,
} = require('../controllers/examController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getExams);
router.post('/create', protect, requireAdmin, createExam);
router.get('/:examId/start', protect, startExamSession);
router.patch('/:examId/toggle-lock', protect, requireAdmin, toggleLock);
router.delete('/:examId', protect, requireAdmin, deleteExam);

module.exports = router;
