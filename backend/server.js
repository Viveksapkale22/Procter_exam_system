const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { initSocket } = require('./socket/socketHandler');
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const submissionRoutes = require('./routes/submissionRoutes');

// Optional: Keep DNS fix if required for local Atlas connection, 
// but wrapped to avoid overriding Render's internal network DNS if issues occur
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const app = express();
const server = http.createServer(app);

// Production CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL || 'https://procter-exam-system.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
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