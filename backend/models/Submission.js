const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    questionIndex: { type: Number, required: true },
    selectedOption: { type: Number, default: -1 },
  },
  { _id: false }
);

const QuestionResultSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    options: [{ type: String }],
    selectedOption: { type: Number, default: -1 },
    correctOptionIndex: { type: Number, default: -1 },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const SubmissionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    assignedQuestions: [{ type: String }],
    answers: [AnswerSchema],
    questionResults: [QuestionResultSchema],
    score: { type: Number, default: 0 },
    tabSwitchCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['SUBMITTED_NORMAL', 'AUTO_SUBMITTED_TIMEOUT', 'DISQUALIFIED_CHEATING'],
      default: 'SUBMITTED_NORMAL',
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', SubmissionSchema);
