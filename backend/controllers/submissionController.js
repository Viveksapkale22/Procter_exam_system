const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { calculateSubmissionScore } = require('../utils/examLogic');
const { emitSubmissionUpdate } = require('../socket/socketHandler');

const buildQuestionResults = (exam, assignedQuestionIds = [], answers = []) => {
  const questionMap = new Map(
    exam.questionPool.map((question) => [String(question._id), question])
  );

  const answerMap = new Map((answers || []).map((answer) => [String(answer.questionId), answer]));

  return (assignedQuestionIds || []).map((questionId) => {
    const question = questionMap.get(String(questionId));
    const answer = answerMap.get(String(questionId));
    const selectedOption = Number(answer?.selectedOption ?? -1);
    const isCorrect = !!question && Number(question.correctOptionIndex) === selectedOption;

    return {
      questionId: String(questionId),
      questionText: question?.questionText || 'Unknown question',
      options: question?.options || [],
      selectedOption,
      correctOptionIndex: question ? Number(question.correctOptionIndex) : -1,
      isCorrect,
    };
  });
};

const formatSubmission = (submission, includeQuestionResults = false) => ({
  id: submission._id,
  _id: submission._id,
  studentName: submission.studentId?.name || 'Unknown',
  rollNumber: submission.studentId?.rollNumber || 'N/A',
  examTitle: submission.examId?.title || 'Unknown Exam',
  subject: submission.subject || submission.examId?.subject || 'Uncategorized',
  score: submission.score,
  tabSwitchCount: submission.tabSwitchCount,
  status: submission.status,
  submittedAt: submission.submittedAt || submission.createdAt,
  ...(includeQuestionResults ? { questionResults: submission.questionResults || [] } : {}),
});

const getStoredOrRebuiltResults = (submission) => {
  if (Array.isArray(submission.questionResults) && submission.questionResults.length > 0) {
    return submission.questionResults;
  }

  const assignedIds = submission.assignedQuestions?.length
    ? submission.assignedQuestions
    : (submission.answers || []).map((answer) => answer.questionId);

  return submission.examId?.questionPool
    ? buildQuestionResults(submission.examId, assignedIds, submission.answers || [])
    : [];
};

exports.submitExam = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit an exam.' });
    }

    const { examId, answers, tabSwitchCount, status, assignedQuestions } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const assignedIds = Array.isArray(assignedQuestions) && assignedQuestions.length > 0
      ? assignedQuestions
      : exam.questionPool.slice(0, 5).map((question) => String(question._id));

    const questionResults = buildQuestionResults(exam, assignedIds, answers || []);
    const actualScore = questionResults.filter((result) => result.isCorrect).length;

    const submission = await Submission.create({
      studentId: req.user._id,
      examId,
      subject: exam.subject, // Explicitly saved to the database record
      assignedQuestions: assignedIds,
      answers: (answers || []).map((answer, index) => ({
        questionId: answer.questionId,
        questionIndex: answer.questionIndex ?? index,
        selectedOption: Number(answer.selectedOption),
      })),
      questionResults,
      score: actualScore,
      tabSwitchCount: Number(tabSwitchCount) || 0,
      status: status || 'SUBMITTED_NORMAL',
      submittedAt: new Date(),
    });

    emitSubmissionUpdate({
      id: submission._id,
      studentName: req.user.name,
      rollNumber: req.user.rollNumber,
      subject: exam.subject, // Transmitted for real-time subject-wise dashboard updates
      score: actualScore,
      tabSwitchCount: Number(tabSwitchCount) || 0,
      status: status || 'SUBMITTED_NORMAL',
      examTitle: exam.title,
      submittedAt: submission.createdAt || submission.submittedAt,
      questionResults,
    });

    return res.status(201).json({
      message: 'Exam submitted successfully.',
      score: actualScore,
      status: status || 'SUBMITTED_NORMAL',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Exam submission failed.', error: error.message });
  }
};

exports.getSubmissionFeed = async (req, res) => {
  try {
    const submissions = await Submission.find({})
      .populate('studentId', 'name rollNumber department')
      .populate('examId', 'title subject') // Included subject field from Exam schema
      .sort({ createdAt: -1 });

    const feed = submissions.map((submission) => formatSubmission(submission));

    return res.json(feed);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load feed.', error: error.message });
  }
};

exports.getSubmissionDetails = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('studentId', 'name rollNumber department')
      .populate('examId', 'title subject questionPool');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const details = formatSubmission(submission, true);
    details.questionResults = getStoredOrRebuiltResults(submission);
    return res.json(details);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load submission details.', error: error.message });
  }
};

exports.getMySubmissionFeed = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('examId', 'title subject')
      .sort({ createdAt: -1 });

    return res.json(submissions.map((submission) => formatSubmission(submission)));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load your submissions.', error: error.message });
  }
};

exports.getMySubmissionDetails = async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      studentId: req.user._id,
    }).populate('examId', 'title subject questionPool');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const details = formatSubmission(submission, true);
    details.questionResults = getStoredOrRebuiltResults(submission);
    return res.json(details);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load your submission details.', error: error.message });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    await submission.deleteOne();
    return res.json({ message: 'Submission deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete submission.', error: error.message });
  }
};

exports.deleteSubmissionsBySubject = async (req, res) => {
  try {
    const result = await Submission.deleteMany({ subject: req.params.subject });
    return res.json({ message: 'Subject submissions deleted successfully.', deletedCount: result.deletedCount });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete subject submissions.', error: error.message });
  }
};
