const express = require('express');
const { submitExam, getSubmissionFeed, deleteSubmission } = require('../controllers/submissionController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/submit', protect, submitExam);
router.get('/admin-feed', protect, requireAdmin, getSubmissionFeed);
router.delete('/:submissionId', protect, requireAdmin, deleteSubmission);

module.exports = router;
