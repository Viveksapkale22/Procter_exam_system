const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    rollNumber: { type: String, trim: true, maxlength: 50, default: '' },
    department: { type: String, trim: true, maxlength: 150, default: '' },
    message: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
