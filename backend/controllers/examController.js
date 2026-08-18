const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { selectRandomQuestions, sanitizeQuestions } = require('../utils/examLogic');
const { emitExamLockStatus } = require('../socket/socketHandler');

// 1. Get All Exams (Admin/General)
exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find({}).sort({ createdAt: -1 });
    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch exams.' });
  }
};

// 2. Create Exam (Admin) - UPDATED with Subject, Levels, and 10 question logic
exports.createExam = async (req, res) => {
  try {
    const { title, subject, durationSeconds, displayCount, questionPool } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'Exam Title and Subject are required.' });
    }

    const minRequired = Number(displayCount) || 5;
    if (!questionPool || questionPool.length < minRequired) {
      return res.status(400).json({ 
        message: `Please add at least ${minRequired} questions to create this exam.` 
      });
    }

    const newExam = new Exam({
      title,
      subject,
      durationSeconds: Number(durationSeconds) || 120,
      displayCount: minRequired,
      questionPool
    });

    await newExam.save();
    return res.status(201).json(newExam);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create exam', error: error.message });
  }
};

// 3. Start Exam (Student) - UPDATED to handle shuffle, display limits, and re-exam prevention
exports.startExamSession = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (exam.isLocked) {
      return res.status(403).json({ message: 'Exam is currently locked by Admin.' });
    }

    // Prevent re-exam: Check if a submission already exists for this user and exam
    const existingSubmission = await Submission.findOne({
      examId: req.params.examId,
      studentId: req.user._id,
    });

    if (existingSubmission) {
      return res.status(403).json({ message: 'You have already submitted this exam and cannot retake it.' });
    }

    // Shuffles the 10 questions and picks 5 (based on displayCount)
    const countToDisplay = exam.displayCount || 5;
    const selectedQuestions = selectRandomQuestions(exam.questionPool, countToDisplay);
    const sanitizedQuestions = sanitizeQuestions(selectedQuestions);

    const examPayload = {
      _id: exam._id,
      title: exam.title,
      subject: exam.subject, // Added Subject to payload
      durationSeconds: exam.durationSeconds,
      questions: sanitizedQuestions,
      assignedQuestionIds: selectedQuestions.map((question) => String(question._id)),
    };

    return res.json(examPayload);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to start exam session.', error: error.message });
  }
};

// 4. Toggle Lock (Admin)
exports.toggleLock = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    exam.isLocked = !exam.isLocked;
    await exam.save();

    // Emit socket event if socket.io instance is available on app
    const io = req.app.get('io');
    if (io) {
      io.emit('exam-lock-status', { examId: exam._id, isLocked: exam.isLocked });
    }

    return res.status(200).json({ isLocked: exam.isLocked, message: `Exam ${exam.isLocked ? 'locked' : 'unlocked'}` });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to toggle lock', error: error.message });
  }
};

// 5. Delete Exam (Admin) - BRAND NEW
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }
    
    // Optional: Delete associated submissions if needed
    // await Submission.deleteMany({ examId: req.params.examId });

    return res.json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete exam.', error: error.message });
  }
};