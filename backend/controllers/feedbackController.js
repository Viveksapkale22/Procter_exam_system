const Feedback = require('../models/Feedback');

exports.createFeedback = async (req, res) => {
  try {
    const { name, rollNumber, department, message } = req.body;
    if (!String(name || '').trim() || !String(message || '').trim()) {
      return res.status(400).json({ message: 'Your name and feedback message are required.' });
    }

    const feedback = await Feedback.create({
      name: String(name).trim(),
      rollNumber: String(rollNumber || '').trim(),
      department: String(department || '').trim(),
      message: String(message).trim(),
    });

    return res.status(201).json({ message: 'Thank you for your feedback!', feedback });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to submit feedback.', error: error.message });
  }
};

exports.getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({}).sort({ isRead: 1, createdAt: -1 });
    return res.json(feedback);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load feedback.', error: error.message });
  }
};

exports.markFeedbackRead = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.feedbackId,
      { isRead: true },
      { new: true, runValidators: true }
    );

    if (!feedback) return res.status(404).json({ message: 'Feedback not found.' });
    return res.json(feedback);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update feedback.', error: error.message });
  }
};
