const express = require('express');
const {
  submitExam,
  getSubmissionFeed,
  getSubmissionDetails,
  getMySubmissionFeed,
  getMySubmissionDetails,
  deleteSubmission,
  deleteSubmissionsBySubject,
} = require('../controllers/submissionController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/submit', protect, submitExam);
router.get('/admin-feed', protect, requireAdmin, getSubmissionFeed);
router.get('/mine', protect, getMySubmissionFeed);
router.get('/mine/:submissionId', protect, getMySubmissionDetails);
router.delete('/subject/:subject', protect, requireAdmin, deleteSubmissionsBySubject);
router.get('/:submissionId', protect, requireAdmin, getSubmissionDetails);
router.delete('/:submissionId', protect, requireAdmin, deleteSubmission);

module.exports = router;
