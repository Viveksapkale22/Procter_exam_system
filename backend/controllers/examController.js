const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { selectRandomQuestions, sanitizeQuestions } = require('../utils/examLogic');
const { emitExamLockStatus } = require('../socket/socketHandler');

exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find({}).sort({ createdAt: -1 });
    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch exams.' });
  }
};

exports.createExam = async (req, res) => {
  try {
    const { title, durationSeconds, questionPool } = req.body;

    if (!title || !Array.isArray(questionPool) || questionPool.length < 5) {
      return res.status(400).json({ message: 'Exam title and at least 5 questions are required.' });
    }

    const cleanedQuestions = questionPool.map((question) => {
      const options = Array.isArray(question.options) ? question.options.map((option) => String(option).trim()).filter(Boolean) : [];
      if (options.length < 2) {
        throw new Error('Each question must have at least two valid options.');
      }

      const correctOptionIndex = Number(question.correctOptionIndex);
      return {
        questionText: String(question.questionText || '').trim(),
        options,
        correctOptionIndex: Number.isInteger(correctOptionIndex) ? correctOptionIndex : 0,
      };
    }).filter((question) => question.questionText);

    if (cleanedQuestions.length < 5) {
      return res.status(400).json({ message: 'At least 5 valid questions are required.' });
    }

    const exam = await Exam.create({
      title: String(title).trim(),
      durationSeconds: Number(durationSeconds) || 120,
      questionPool: cleanedQuestions,
      isLocked: true,
    });

    return res.status(201).json(exam);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create exam.', error: error.message });
  }
};

exports.startExamSession = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (exam.isLocked) {
      return res.status(403).json({ message: 'Exam is currently locked by Admin.' });
    }

    const selectedQuestions = selectRandomQuestions(exam.questionPool, 5);
    const sanitizedQuestions = sanitizeQuestions(selectedQuestions);

    const examPayload = {
      _id: exam._id,
      title: exam.title,
      durationSeconds: exam.durationSeconds,
      questions: sanitizedQuestions,
      assignedQuestionIds: selectedQuestions.map((question) => String(question._id)),
    };

    return res.json(examPayload);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to start exam session.', error: error.message });
  }
};

exports.toggleExamLock = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    exam.isLocked = !exam.isLocked;
    await exam.save();

    emitExamLockStatus(exam._id.toString(), exam.isLocked);
    return res.json({
      examId: exam._id,
      isLocked: exam.isLocked,
      message: exam.isLocked ? 'Exam locked' : 'Exam unlocked',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to toggle lock.', error: error.message });
  }
};
