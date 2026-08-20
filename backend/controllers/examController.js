const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { selectRandomQuestions, sanitizeQuestions } = require('../utils/examLogic');
const { emitExamLockStatus } = require('../socket/socketHandler');

// 1. Get All Exams (Admin/General)
exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find({}).sort({ createdAt: -1 });
    // Only admins need the full question pool (including correct answers) to
    // manage an exam. Students receive safe exam metadata only.
    if (req.user.role === 'admin') {
      return res.json(exams);
    }

    return res.json(exams.map((exam) => ({
      _id: exam._id,
      title: exam.title,
      subject: exam.subject,
      durationSeconds: exam.durationSeconds,
      displayCount: exam.displayCount,
      isLocked: exam.isLocked,
    })));
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

    emitExamLockStatus(exam._id, exam.isLocked);

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

exports.updateExam = async (req, res) => {
  try {
    const { title, subject, durationSeconds, displayCount, questionPool } = req.body;
    const exam = await Exam.findById(req.params.examId);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (!String(title || '').trim() || !String(subject || '').trim()) {
      return res.status(400).json({ message: 'Exam title and subject are required.' });
    }

    const questionCount = Number(displayCount) || 5;
    if (!Array.isArray(questionPool) || questionPool.length < questionCount) {
      return res.status(400).json({
        message: `Please provide at least ${questionCount} valid questions.`,
      });
    }

    exam.title = String(title).trim();
    exam.subject = String(subject).trim();
    exam.durationSeconds = Number(durationSeconds) || 120;
    exam.displayCount = questionCount;
    // Existing embedded question ids are retained by the client, which keeps
    // an in-progress student's stored assignment valid after an edit.
    exam.questionPool = questionPool;
    await exam.save();

    return res.json(exam);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update exam.', error: error.message });
  }
};
