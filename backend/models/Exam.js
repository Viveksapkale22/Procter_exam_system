const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: { type: [String], required: true, validate: [arr => arr.length >= 2, 'Must have at least 2 options'] },
    correctOptionIndex: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    durationSeconds: { type: Number, default: 120 },
    isLocked: { type: Boolean, default: true },
    questionPool: [QuestionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', ExamSchema);
