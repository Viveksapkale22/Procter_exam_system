const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: '7d' }
);

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  rollNumber: user.rollNumber,
  department: user.department,
  role: user.role,
});

exports.register = async (req, res) => {
  try {
    const { name, rollNumber, department, password, role } = req.body;

    if (!name || !rollNumber || !department || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (role === 'admin' || String(rollNumber).trim() === (process.env.ADMIN_ROLL_NUMBER || 'ADMIN001').trim()) {
      return res.status(403).json({ message: 'Admin account is fixed and cannot be registered through the public form.' });
    }

    const existingUser = await User.findOne({ rollNumber });
    if (existingUser) {
      return res.status(409).json({ message: 'Roll number already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      rollNumber,
      department,
      password: hashedPassword,
      role: 'student',
    });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user.', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { rollNumber, password } = req.body;

    if (!rollNumber || !password) {
      return res.status(400).json({ message: 'Roll number and password are required.' });
    }

    const fixedAdminRoll = (process.env.ADMIN_ROLL_NUMBER || 'ADMIN001').trim();
    const fixedAdminUser = await User.findOne({ rollNumber: fixedAdminRoll, role: 'admin' });

    if (
      fixedAdminUser &&
      String(rollNumber).trim() === fixedAdminRoll &&
      (await bcrypt.compare(password, fixedAdminUser.password))
    ) {
      const token = generateToken(fixedAdminUser);
      return res.json({ token, user: sanitizeUser(fixedAdminUser) });
    }

    const user = await User.findOne({ rollNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
};
