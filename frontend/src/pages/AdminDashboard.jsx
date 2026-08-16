import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const createQuestionTemplate = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
});

const buildEmptyQuestionPool = () => Array.from({ length: 5 }, () => createQuestionTemplate());

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [examTitle, setExamTitle] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [questionPool, setQuestionPool] = useState(buildEmptyQuestionPool());
  const [exams, setExams] = useState([]);
  const [feed, setFeed] = useState([]);
  const [socketState, setSocketState] = useState('offline');
  const [deletingIds, setDeletingIds] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchInitialData = async () => {
      try {
        const [examsResponse, feedResponse] = await Promise.all([
          axios.get(`${API_BASE}/exams`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/submissions/admin-feed`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setExams(examsResponse.data || []);
        setFeed(feedResponse.data || []);
      } catch (error) {
        console.error('Admin data load failed', error);
      }
    };

    fetchInitialData();

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
    });

    socket.on('connect', () => setSocketState('online'));
    socket.on('disconnect', () => setSocketState('offline'));
    socket.on('exam-lock-status', ({ examId, isLocked }) => {
      setExams((prev) => prev.map((exam) => (exam._id === examId ? { ...exam, isLocked } : exam)));
    });
    socket.on('submission-update', (submission) => {
      setFeed((prev) => [submission, ...prev].slice(0, 20));
    });

    socket.emit('join-admin-room');

    return () => socket.disconnect();
  }, [navigate, token, user]);

  const totalQuestionEntries = useMemo(
    () => questionPool.filter((question) => String(question.questionText || '').trim()).length,
    [questionPool]
  );

  const handleQuestionChange = (index, field, value) => {
    setQuestionPool((prev) => {
      const next = [...prev];

      if (field === 'questionText') {
        next[index] = { ...next[index], questionText: value };
      }

      if (field === 'option') {
        next[index] = {
          ...next[index],
          options: next[index].options.map((item, optionIndex) =>
            optionIndex === value.optionIndex ? value.optionValue : item
          ),
        };
      }

      if (field === 'correctOptionIndex') {
        next[index] = { ...next[index], correctOptionIndex: Number(value) };
      }

      return next;
    });
  };

  const createExam = async () => {
    const cleanedQuestions = questionPool
      .map((question) => ({
        questionText: String(question.questionText || '').trim(),
        options: (question.options || []).map((option) => String(option || '').trim()).filter(Boolean),
        correctOptionIndex: Number(question.correctOptionIndex),
      }))
      .filter((question) => question.questionText);

    if (!examTitle.trim() || cleanedQuestions.length < 5) {
      alert('Please enter an exam title and at least 5 valid questions.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE}/exams/create`,
        {
          title: examTitle.trim(),
          durationSeconds: Number(durationSeconds) || 120,
          questionPool: cleanedQuestions,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setExams((prev) => [response.data, ...prev]);
      setExamTitle('');
      setDurationSeconds(120);
      setQuestionPool(buildEmptyQuestionPool());
    } catch (error) {
      console.error('Exam creation failed', error);
      alert(error.response?.data?.message || 'Failed to create exam.');
    }
  };

  const toggleLock = async (examId) => {
    try {
      const response = await axios.patch(
        `${API_BASE}/exams/${examId}/toggle-lock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setExams((prev) =>
        prev.map((exam) =>
          exam._id === examId ? { ...exam, isLocked: response.data.isLocked } : exam
        )
      );
    } catch (error) {
      console.error('Lock toggle failed', error);
      alert(error.response?.data?.message || 'Failed to toggle exam lock.');
    }
  };

  const deleteSubmission = async (submissionId) => {
    try {
      setDeletingIds((prev) => [...prev, submissionId]);
      await axios.delete(`${API_BASE}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFeed((prev) => prev.filter((item) => (item.id || item._id) !== submissionId));
    } catch (error) {
      console.error('Submission deletion failed', error);
      alert(error.response?.data?.message || 'Failed to delete submission.');
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== submissionId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Admin Dashboard</h2>
            <p className="text-sm text-slate-500">Socket: {socketState}</p>
          </div>
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
            {user?.department || 'Admin'}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create New Exam</h3>
          <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">
            {totalQuestionEntries} valid questions
          </span>
        </div>

        <div className="space-y-4">
          <input
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            placeholder="Exam title"
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
          />
          <input
            type="number"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value) || 120)}
            placeholder="Duration in seconds"
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
          />

          {questionPool.map((question, index) => (
            <div key={`question-${index}`} className="rounded-xl border border-slate-200 p-3">
              <label className="mb-2 block text-sm font-medium">Question {index + 1}</label>
              <input
                value={question.questionText}
                onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                placeholder="Question prompt"
                className="mb-3 w-full rounded-xl border border-slate-300 px-3 py-3"
              />

              <div className="grid grid-cols-2 gap-2">
                {question.options.map((option, optionIndex) => (
                  <input
                    key={`option-${index}-${optionIndex}`}
                    value={option}
                    onChange={(e) =>
                      handleQuestionChange(index, 'option', {
                        optionIndex,
                        optionValue: e.target.value,
                      })
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                ))}
              </div>

              <select
                value={question.correctOptionIndex}
                onChange={(e) => handleQuestionChange(index, 'correctOptionIndex', e.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3"
              >
                {question.options.map((_, optionIndex) => (
                  <option key={`correct-${index}-${optionIndex}`} value={optionIndex}>
                    Correct option {optionIndex + 1}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button
            type="button"
            onClick={createExam}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white"
          >
            Save Exam
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-lg font-semibold">Exam Controls</h3>
        <div className="space-y-3">
          {exams.length === 0 ? (
            <p className="text-sm text-slate-500">No exams created yet.</p>
          ) : (
            exams.map((exam) => (
              <div
                key={exam._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-xs text-slate-500">
                    {exam.questionPool?.length || 0} questions • {exam.durationSeconds || 120}s
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleLock(exam._id)}
                  className={`rounded-lg px-4 py-2 font-medium text-white ${
                    exam.isLocked ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  {exam.isLocked ? 'Lock Exam' : 'Unlock Exam'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-lg font-semibold">Submission Feed</h3>
        <div className="space-y-3">
          {feed.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            feed.map((item, index) => (
              <div
                key={item.id || item._id || `${item.rollNumber || 'student'}-${index}`}
                className={`rounded-xl border p-3 ${
                  item.status === 'DISQUALIFIED_CHEATING' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{item.studentName || item.rollNumber || 'Student'}</p>
                    <p className="text-xs text-slate-500">Exam: {item.examTitle || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === 'DISQUALIFIED_CHEATING' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status || 'SUBMITTED_NORMAL'}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubmission(item.id || item._id)}
                      disabled={deletingIds.includes(item.id || item._id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
                    >
                      {deletingIds.includes(item.id || item._id) ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  Roll: {item.rollNumber || 'N/A'} • Score: {item.score || 0}
                </p>
                <p className="text-sm text-slate-600">Tab switches: {item.tabSwitchCount || 0}</p>

                {Array.isArray(item.questionResults) && item.questionResults.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-2">#</th>
                          <th className="py-2 pr-2">Question</th>
                          <th className="py-2 pr-2">Your answer</th>
                          <th className="py-2 pr-2">Correct answer</th>
                          <th className="py-2 pr-2">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.questionResults.map((question, questionIndex) => (
                          <tr
                            key={`${question.questionId || questionIndex}-${questionIndex}`}
                            className="border-b border-slate-200 last:border-b-0"
                          >
                            <td className="py-2 pr-2">{questionIndex + 1}</td>
                            <td className="py-2 pr-2">{question.questionText || 'N/A'}</td>
                            <td className="py-2 pr-2">
                              {typeof question.selectedOption === 'number' && question.options?.[question.selectedOption]
                                ? question.options[question.selectedOption]
                                : 'No answer'}
                            </td>
                            <td className="py-2 pr-2">
                              {typeof question.correctOptionIndex === 'number' && question.options?.[question.correctOptionIndex]
                                ? question.options[question.correctOptionIndex]
                                : 'N/A'}
                            </td>
                            <td
                              className={`py-2 pr-2 font-semibold ${
                                question.isCorrect ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {question.isCorrect ? 'Correct' : 'Wrong'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
