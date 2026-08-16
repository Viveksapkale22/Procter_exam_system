const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { initSocket } = require('./socket/socketHandler');
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const submissionRoutes = require('./routes/submissionRoutes');

const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const app = express();
const server = http.createServer(app);

// Explicit list of allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://procter-exam-system.vercel.app'
];

// Automatically sanitize process.env.FRONTEND_URL (removes trailing slashes if present)
if (process.env.FRONTEND_URL) {
  const cleanFrontendUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(cleanFrontendUrl)) {
    allowedOrigins.push(cleanFrontendUrl);
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server requests or matching origin domains
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Pass false instead of throwing an Error object to prevent 500 crashes
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.send('Proctor Exam System API is running, by vivek sapkale');
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/submissions', submissionRoutes);

initSocket(server);

async function startServer() {
  try {
    await connectDB();

    const port = Number(process.env.PORT) || 5000;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;