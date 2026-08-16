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

exports.submitExam = async (req, res) => {
  try {
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
      score: actualScore,
      tabSwitchCount: Number(tabSwitchCount) || 0,
      status: status || 'SUBMITTED_NORMAL',
      examTitle: exam.title,
      submittedAt: submission.createdAt,
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
      .populate('examId', 'title')
      .sort({ createdAt: -1 });

    const feed = submissions.map((submission) => ({
      id: submission._id,
      studentName: submission.studentId?.name || 'Unknown',
      rollNumber: submission.studentId?.rollNumber || 'N/A',
      examTitle: submission.examId?.title || 'Unknown Exam',
      score: submission.score,
      tabSwitchCount: submission.tabSwitchCount,
      status: submission.status,
      submittedAt: submission.submittedAt,
      questionResults: Array.isArray(submission.questionResults) ? submission.questionResults : [],
    }));

    return res.json(feed);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load feed.' });
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
