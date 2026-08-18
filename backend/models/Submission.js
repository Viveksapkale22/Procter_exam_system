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

const answerDetailSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId },
  questionText: { type: String },
  options: [{ type: String }],
  selectedOption: { type: Number, default: -1 },
  correctOptionIndex: { type: Number },
  isCorrect: { type: Boolean, default: false }
});

const submissionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String },
  rollNumber: { type: String },
  subject: { type: String, required: true },
  score: { type: Number, default: 0 },
  status: { type: String, default: 'SUBMITTED_NORMAL' },
  tabSwitchCount: { type: Number, default: 0 },
  answers: [answerDetailSchema]
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);