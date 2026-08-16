const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function preSave(next) {
  if (this.role === 'admin') {
    const adminCount = await mongoose.models.User.countDocuments({ role: 'admin' });
    if (this.isNew && adminCount > 0 && this.rollNumber !== (process.env.ADMIN_ROLL_NUMBER || 'ADMIN001')) {
      const error = new Error('Only one admin account is allowed.');
      return next(error);
    }
  }

  next();
});

module.exports = mongoose.model('User', UserSchema);
