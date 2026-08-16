const { Server } = require('socket.io');

let io;

function initSocket(server) {
  const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL || 'https://procter-exam-system.vercel.app'
  ];

  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by Socket CORS'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-admin-room', () => {
      socket.join('admin-room');
    });

    socket.on('join-student-room', ({ studentId }) => {
      if (studentId) {
        socket.join(`student-${studentId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

function emitExamLockStatus(examId, isLocked) {
  if (!io) return;
  io.emit('exam-lock-status', { examId, isLocked });
}

function emitSubmissionUpdate(submission) {
  if (!io) return;
  io.to('admin-room').emit('submission-update', submission);
}

module.exports = {
  initSocket,
  emitExamLockStatus,
  emitSubmissionUpdate,
};