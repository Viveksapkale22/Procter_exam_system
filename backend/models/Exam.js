const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  level: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  durationSeconds: { type: Number, default: 120 },
  displayCount: { type: Number, default: 5 },
  isLocked: { type: Boolean, default: false },
  questionPool: [questionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);