const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');

let memoryServer;

async function seedDefaultAdmin() {
  const adminRollNumber = (process.env.ADMIN_ROLL_NUMBER || 'ADMIN001').trim();
  const adminName = (process.env.ADMIN_NAME || 'Admin').trim();
  const adminDepartment = (process.env.ADMIN_DEPARTMENT || 'Computer Science').trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  if (!adminRollNumber || !adminPassword) {
    throw new Error('Admin credentials are missing. Set ADMIN_ROLL_NUMBER and ADMIN_PASSWORD in .env');
  }

  await User.deleteMany({ role: 'admin', rollNumber: { $ne: adminRollNumber } });

  const existingAdmin = await User.findOne({ rollNumber: adminRollNumber });
  if (existingAdmin) {
    const needsUpdate =
      existingAdmin.name !== adminName ||
      existingAdmin.department !== adminDepartment ||
      !(await bcrypt.compare(adminPassword, existingAdmin.password));

    if (needsUpdate) {
      existingAdmin.name = adminName;
      existingAdmin.department = adminDepartment;
      existingAdmin.password = await bcrypt.hash(adminPassword, 10);
      await existingAdmin.save();
    }

    return existingAdmin;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminUser = await User.create({
    name: adminName,
    rollNumber: adminRollNumber,
    department: adminDepartment,
    password: hashedPassword,
    role: 'admin',
  });

  console.log(`Seeded default admin: ${adminUser.rollNumber}`);
  return adminUser;
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  try {
    if (mongoUri) {
      try {
        await mongoose.connect(mongoUri, {
          dbName: process.env.DB_NAME || 'proctor_exam_system',
        });
        console.log('MongoDB connected using configured URI');
      } catch (uriError) {
        console.warn('Configured MongoDB URI failed, falling back to in-memory database:', uriError.message);
        memoryServer = await MongoMemoryServer.create();
        const fallbackUri = memoryServer.getUri();

        await mongoose.connect(fallbackUri, {
          dbName: process.env.DB_NAME || 'proctor_exam_system',
        });

        console.log('MongoDB connected using in-memory server fallback');
      }
    } else {
      memoryServer = await MongoMemoryServer.create();
      const uri = memoryServer.getUri();

      await mongoose.connect(uri, {
        dbName: process.env.DB_NAME || 'proctor_exam_system',
      });

      console.log('MongoDB connected using in-memory server');
    }

    await seedDefaultAdmin();
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB, seedDefaultAdmin };
