import { useEffect, useMemo, useState, Fragment } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_BASE, SOCKET_URL } from '../config/api';

const createQuestionTemplate = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
  level: 'Medium',
});

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Navigation State
  const [activeTab, setActiveTab] = useState('create');

  // Exam Form State
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [displayCount, setDisplayCount] = useState(5);
  const [editingExamId, setEditingExamId] = useState(null);
  const [questionPool, setQuestionPool] = useState([
    createQuestionTemplate(),
    createQuestionTemplate(),
    createQuestionTemplate(),
    createQuestionTemplate(),
    createQuestionTemplate(),
  ]);

  // Data States
  const [exams, setExams] = useState([]);
  const [rawSubmissions, setRawSubmissions] = useState([]);
  const [socketState, setSocketState] = useState('offline');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});
  const [detailsError, setDetailsError] = useState({});

  // Subject Accordion State (tracks expanded subject names)
  const [expandedSubjects, setExpandedSubjects] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchInitialData();

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    setSocketState('connecting');
    socket.on('connect', () => setSocketState('online'));
    socket.on('disconnect', () => setSocketState('offline'));
    socket.on('connect_error', (error) => {
      console.error('Socket connection failed', error.message);
      setSocketState('offline');
    });
    socket.on('exam-lock-status', ({ examId, isLocked }) => {
      setExams((prev) => prev.map((e) => (e._id === examId ? { ...e, isLocked } : e)));
    });
    socket.on('submission-update', () => {
      fetchInitialData();
    });

    socket.emit('join-admin-room');

    return () => socket.disconnect();
  }, [navigate, token, user]);

  const fetchInitialData = async () => {
    try {
      const [examsResponse, feedResponse] = await Promise.all([
        axios.get(`${API_BASE}/exams`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/submissions/admin-feed`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setExams(examsResponse.data || []);
      setRawSubmissions(feedResponse.data || []);
    } catch (error) {
      console.error('Data load failed', error);
    }
  };

  // Group Submissions by Subject & Sort by Roll Number
  const groupedFeed = useMemo(() => {
    const grouped = {};

    rawSubmissions.forEach((sub) => {
      const subjectKey = sub.subject || sub.examId?.subject || 'Uncategorized';
      if (!grouped[subjectKey]) grouped[subjectKey] = [];
      grouped[subjectKey].push(sub);
    });

    Object.keys(grouped).forEach((subject) => {
      grouped[subject].sort((a, b) => {
        const rollA = String(a.rollNumber || a.studentId?.rollNumber || '');
        const rollB = String(b.rollNumber || b.studentId?.rollNumber || '');
        return rollA.localeCompare(rollB, undefined, { numeric: true });
      });
    });

    return grouped;
  }, [rawSubmissions]);

  // Auto-expand the first subject on initial data load
  useEffect(() => {
    const subjects = Object.keys(groupedFeed);
    if (subjects.length > 0 && expandedSubjects.length === 0) {
      setExpandedSubjects([subjects[0]]);
    }
  }, [groupedFeed]);

  // Toggle single subject accordion collapse/expand
  const toggleSubjectAccordion = (subject) => {
    setExpandedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const toggleSubmissionDetails = async (submissionId) => {
    if (expandedStudent === submissionId) {
      setExpandedStudent(null);
      return;
    }

    setExpandedStudent(submissionId);
    if (submissionDetails[submissionId] || detailsLoading[submissionId]) return;

    setDetailsLoading((previous) => ({ ...previous, [submissionId]: true }));
    setDetailsError((previous) => ({ ...previous, [submissionId]: '' }));
    try {
      const response = await axios.get(`${API_BASE}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissionDetails((previous) => ({ ...previous, [submissionId]: response.data }));
    } catch (error) {
      setDetailsError((previous) => ({
        ...previous,
        [submissionId]: error.response?.data?.message || 'Unable to load this evaluation.',
      }));
    } finally {
      setDetailsLoading((previous) => ({ ...previous, [submissionId]: false }));
    }
  };

  const resetExamForm = () => {
    setEditingExamId(null);
    setExamTitle('');
    setExamSubject('');
    setDurationSeconds(120);
    setDisplayCount(5);
    setQuestionPool(Array.from({ length: 5 }, createQuestionTemplate));
  };

  const startEditExam = (exam) => {
    setEditingExamId(exam._id);
    setExamTitle(exam.title || '');
    setExamSubject(exam.subject || '');
    setDurationSeconds(exam.durationSeconds || 120);
    setDisplayCount(exam.displayCount || 5);
    setQuestionPool(
      (exam.questionPool || []).map((question) => ({
        _id: question._id,
        questionText: question.questionText || '',
        options: [...(question.options || []), '', '', '', ''].slice(0, 4),
        correctOptionIndex: Number(question.correctOptionIndex) || 0,
        level: question.level || 'Medium',
      }))
    );
    setActiveTab('create');
  };

  // Question Form Handlers
  const addQuestionField = () => setQuestionPool((prev) => [...prev, createQuestionTemplate()]);

  const removeQuestionField = (index) => {
    if (questionPool.length <= 1) return;
    setQuestionPool((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestionPool((prev) => {
      const next = [...prev];
      if (field === 'questionText') next[index] = { ...next[index], questionText: value };
      if (field === 'level') next[index] = { ...next[index], level: value };
      if (field === 'option') {
        next[index] = {
          ...next[index],
          options: next[index].options.map((opt, optIdx) =>
            optIdx === value.optionIndex ? value.optionValue : opt
          ),
        };
      }
      if (field === 'correctOptionIndex') {
        next[index] = { ...next[index], correctOptionIndex: Number(value) };
      }
      return next;
    });
  };

  // Exam creation and editing share the same validated form.
  const saveExam = async () => {
    const cleanedQuestions = questionPool
      .map((q) => ({
        ...(q._id ? { _id: q._id } : {}),
        questionText: String(q.questionText || '').trim(),
        options: (q.options || []).map((opt) => String(opt || '').trim()).filter(Boolean),
        correctOptionIndex: Number(q.correctOptionIndex),
        level: q.level,
      }))
      .filter((q) => q.questionText && q.options.length >= 2);

    if (!examTitle.trim() || !examSubject.trim()) {
      alert('Please enter both Exam Title and Subject.');
      return;
    }

    if (cleanedQuestions.length < Number(displayCount)) {
      alert(`You must create at least ${displayCount} valid questions to display ${displayCount} to students.`);
      return;
    }

    try {
      const payload = {
        title: examTitle.trim(),
        subject: examSubject.trim(),
        durationSeconds: Number(durationSeconds) || 120,
        displayCount: Number(displayCount) || 5,
        questionPool: cleanedQuestions,
      };
      const response = editingExamId
        ? await axios.put(`${API_BASE}/exams/${editingExamId}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(
        `${API_BASE}/exams/create`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setExams((prev) =>
        editingExamId
          ? prev.map((exam) => (exam._id === editingExamId ? response.data : exam))
          : [response.data, ...prev]
      );
      resetExamForm();
      alert(editingExamId ? 'Exam updated successfully!' : 'Exam created successfully!');
      setActiveTab('control');
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${editingExamId ? 'update' : 'create'} exam.`);
    }
  };

  const deleteSubmission = async (submissionId) => {
    if (!window.confirm('Delete this submission permanently?')) return;
    try {
      await axios.delete(`${API_BASE}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRawSubmissions((previous) => previous.filter((submission) => (submission.id || submission._id) !== submissionId));
      setExpandedStudent((previous) => (previous === submissionId ? null : previous));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete submission.');
    }
  };

  const deleteSubjectSubmissions = async (subject, count) => {
    if (!window.confirm(`Delete all ${count} submission(s) for ${subject}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/submissions/subject/${encodeURIComponent(subject)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRawSubmissions((previous) => previous.filter((submission) => submission.subject !== subject));
      setExpandedSubjects((previous) => previous.filter((item) => item !== subject));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete subject submissions.');
    }
  };

  // Lock / Unlock System
  const toggleLock = async (examId) => {
    try {
      const response = await axios.patch(
        `${API_BASE}/exams/${examId}/toggle-lock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newIsLocked = response.data?.isLocked ?? response.data?.exam?.isLocked;

      setExams((prev) =>
        prev.map((exam) =>
          exam._id === examId
            ? { ...exam, isLocked: newIsLocked !== undefined ? newIsLocked : !exam.isLocked }
            : exam
        )
      );
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle exam lock status.');
    }
  };

  const deleteExam = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await axios.delete(`${API_BASE}/exams/${examId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExams((prev) => prev.filter((exam) => exam._id !== examId));
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete exam.');
      }
    }
  };

  return (
    <div className="flex min-h-[80vh] gap-6">
      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 bg-white shadow-sm rounded-xl p-4 flex flex-col gap-2 h-fit border border-slate-200">
        <div className="mb-4 border-b pb-4">
          <h2 className="text-xl font-bold text-slate-900">Admin Control</h2>
          <p className="text-xs text-slate-500 mt-1">
            Socket Status:{' '}
            <span className={`font-semibold ${socketState === 'online' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {socketState}
            </span>
          </p>
        </div>
        <button
          onClick={() => setActiveTab('create')}
          className={`text-left p-3 rounded-xl font-medium transition-all ${
            activeTab === 'create' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Create Exam
        </button>
        <button
          onClick={() => setActiveTab('control')}
          className={`text-left p-3 rounded-xl font-medium transition-all ${
            activeTab === 'control' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Manage & Lock Exams
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`text-left p-3 rounded-xl font-medium transition-all ${
            activeTab === 'submissions' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Subject Submissions
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 space-y-6">
        {/* CREATE EXAM TAB */}
        {activeTab === 'create' && (
          <div className="card p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="mb-6 flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {editingExamId ? 'Edit Exam' : 'Create New Exam'}
                </h3>
                {editingExamId && <p className="mt-1 text-xs font-medium text-amber-700">Editing an existing exam</p>}
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">
                Pool Size: {questionPool.length} Questions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <input
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Exam Title (e.g. Midterm Test)"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <input
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value)}
                placeholder="Subject Code / Name (e.g. ED, ESE)"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1">Duration (Seconds)</label>
                <input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-500 mb-1">Questions Assigned to Student</label>
                <input
                  type="number"
                  value={displayCount}
                  onChange={(e) => setDisplayCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2"
                />
              </div>
            </div>

            <div className="space-y-6">
              {questionPool.map((question, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-5 bg-slate-50 relative">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-slate-700">Question {index + 1}</label>
                    <div className="flex items-center gap-3">
                      <select
                        value={question.level}
                        onChange={(e) => handleQuestionChange(index, 'level', e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium bg-white"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                      {questionPool.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestionField(index)}
                          className="text-xs text-rose-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    value={question.questionText}
                    onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                    placeholder="Enter question prompt"
                    className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-3 bg-white"
                  />

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {question.options.map((option, optionIndex) => (
                      <input
                        key={optionIndex}
                        value={option}
                        onChange={(e) =>
                          handleQuestionChange(index, 'option', { optionIndex, optionValue: e.target.value })
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2 bg-white"
                      />
                    ))}
                  </div>

                  <select
                    value={question.correctOptionIndex}
                    onChange={(e) => handleQuestionChange(index, 'correctOptionIndex', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 bg-white"
                  >
                    {question.options.map((_, optionIndex) => (
                      <option key={optionIndex} value={optionIndex}>
                        Set Option {optionIndex + 1} as Correct Answer
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={addQuestionField}
                className="w-1/2 rounded-xl border border-sky-600 text-sky-600 px-4 py-3 font-bold hover:bg-sky-50 transition-colors"
              >
                + Add Another Question
              </button>
              {editingExamId && (
                <button
                  type="button"
                  onClick={resetExamForm}
                  className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={saveExam}
                className="w-1/2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700 transition-colors"
              >
                {editingExamId ? 'Save Exam Changes' : 'Save & Publish Exam'}
              </button>
            </div>
          </div>
        )}

        {/* EXAM CONTROLS TAB */}
        {activeTab === 'control' && (
          <div className="card p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="mb-6 text-2xl font-bold text-slate-800">Manage & Lock Exams</h3>
            <div className="space-y-4">
              {exams.length === 0 ? (
                <p className="text-slate-500">No exams available.</p>
              ) : (
                exams.map((exam) => (
                  <div
                    key={exam._id}
                    className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl border border-slate-200 p-5 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-lg text-slate-900">{exam.title}</p>
                      <p className="text-sm font-semibold text-sky-600 mb-1">Subject: {exam.subject}</p>
                      <p className="text-xs text-slate-500">
                        {exam.questionPool?.length || 0} Total Questions • Displays {exam.displayCount || 5} •{' '}
                        {exam.durationSeconds || 120}s Duration
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEditExam(exam)}
                        className="rounded-lg px-4 py-2 font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleLock(exam._id)}
                        className={`rounded-lg px-5 py-2 font-bold text-white shadow-sm transition-colors ${
                          exam.isLocked
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {exam.isLocked ? 'Locked' : 'Unlocked'}
                      </button>
                      <button
                        onClick={() => deleteExam(exam._id)}
                        className="rounded-lg px-4 py-2 font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUBMISSION FEED TAB (ACCORDION LAYOUT) */}
        {activeTab === 'submissions' && (
          <div className="card p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Subject Submissions</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Click on any subject header to expand or collapse student score details.
                </p>
              </div>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                {Object.keys(groupedFeed).length} Active Subjects
              </span>
            </div>

            {Object.keys(groupedFeed).length === 0 ? (
              <p className="text-slate-500 text-center py-8">No student submissions available yet.</p>
            ) : (
              <div className="space-y-4">
                {Object.keys(groupedFeed).map((subject) => {
                  const isSubjectExpanded = expandedSubjects.includes(subject);
                  const submissionsList = groupedFeed[subject];

                  // Calculate subject performance metrics
                  const avgScore = (
                    submissionsList.reduce((acc, curr) => acc + (curr.score || 0), 0) /
                    (submissionsList.length || 1)
                  ).toFixed(1);

                  return (
                    <div
                      key={subject}
                      className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white transition-all"
                    >
                      {/* ACCORDION HEADER TRIGGER */}
                      <button
                        type="button"
                        onClick={() => toggleSubjectAccordion(subject)}
                        className="w-full bg-slate-800 hover:bg-slate-900 p-4 text-white flex justify-between items-center transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`transform transition-transform duration-200 text-sky-400 font-bold text-sm ${
                              isSubjectExpanded ? 'rotate-90' : ''
                            }`}
                          >
                            ▶
                          </span>
                          <div>
                            <h4 className="text-lg font-bold tracking-wide">Subject: {subject}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Average Score:{' '}
                              <span className="text-sky-300 font-semibold">{avgScore} pts</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-sky-950 text-sky-300 border border-sky-700/50 px-3 py-1 rounded-full font-semibold">
                            {submissionsList.length} {submissionsList.length === 1 ? 'Submission' : 'Submissions'}
                          </span>
                          <span className="text-xs text-slate-300 font-bold bg-slate-700 px-2.5 py-1 rounded-lg">
                            {isSubjectExpanded ? 'Collapse ▲' : 'Expand ▼'}
                          </span>
                        </div>
                      </button>

                      {/* ACCORDION CONTENT */}
                      {isSubjectExpanded && (
                        <div className="overflow-x-auto border-t border-slate-200">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-rose-50 px-4 py-3">
                            <p className="text-xs font-medium text-rose-800">Remove all records in this subject when they are no longer needed.</p>
                            <button
                              type="button"
                              onClick={() => deleteSubjectSubmissions(subject, submissionsList.length)}
                              className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                            >
                              Delete Subject Data
                            </button>
                          </div>
                          <table className="w-full text-left text-sm text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="p-4 font-bold text-slate-800">Roll Number</th>
                                <th className="p-4 font-bold text-slate-800">Student Name</th>
                                <th className="p-4 font-bold text-slate-800">Score</th>
                                <th className="p-4 font-bold text-slate-800">Status</th>
                                <th className="p-4 font-bold text-slate-800">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {submissionsList.map((sub, idx) => {
                                const subId = sub.id || sub._id || idx;
                                const isExpanded = expandedStudent === subId;

                                return (
                                  <Fragment key={subId}>
                                    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                      <td className="p-4 font-bold text-slate-900">
                                        {sub.rollNumber || sub.studentId?.rollNumber || 'N/A'}
                                      </td>
                                      <td className="p-4 font-medium">
                                        {sub.studentName || sub.studentId?.name || 'Student'}
                                      </td>
                                      <td className="p-4 font-bold text-sky-700">{sub.score || 0}</td>
                                      <td className="p-4">
                                        <span
                                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            sub.status === 'Pass' || sub.status === 'SUBMITTED_NORMAL'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : sub.status === 'DISQUALIFIED_CHEATING'
                                              ? 'bg-rose-100 text-rose-800'
                                              : 'bg-amber-100 text-amber-800'
                                          }`}
                                        >
                                          {sub.status || 'SUBMITTED'}
                                        </span>
                                      </td>
                                      <td className="p-4">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => toggleSubmissionDetails(subId)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                                              isExpanded
                                                ? 'bg-slate-800 text-white'
                                                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                                            }`}
                                          >
                                            {isExpanded ? 'Hide Info ▲' : 'View Info ▼'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => deleteSubmission(subId)}
                                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* DETAILED QUESTION BREAKDOWN */}
                                    {isExpanded && (
                                      <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <td colSpan="5" className="p-5">
                                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
                                            <h5 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                              <span>📋</span> Detailed Evaluation Breakdown:
                                            </h5>
                                            <div className="space-y-3">
                                              {detailsLoading[subId] && (
                                                <p className="py-4 text-sm font-medium text-slate-500">
                                                  Loading detailed evaluation…
                                                </p>
                                              )}
                                              {detailsError[subId] && (
                                                <p className="py-4 text-sm font-medium text-rose-600">
                                                  {detailsError[subId]}
                                                </p>
                                              )}
                                              {!detailsLoading[subId] && !detailsError[subId] &&
                                                (submissionDetails[subId]?.questionResults || []).length === 0 && (
                                                  <p className="py-4 text-sm font-medium text-slate-500">
                                                    No detailed evaluation is available for this submission.
                                                  </p>
                                                )}
                                              {(submissionDetails[subId]?.questionResults || []).map((ans, qIdx) => {
                                                const qText =
                                                  ans.questionText ||
                                                  ans.questionId?.questionText ||
                                                  `Question ${qIdx + 1}`;
                                                const options = ans.options || ans.questionId?.options || [];
                                                const selectedIdx = ans.selectedOption;
                                                const correctIdx =
                                                  ans.correctOptionIndex ?? ans.questionId?.correctOptionIndex;
                                                const isCorrect =
                                                  ans.isCorrect ?? (selectedIdx === correctIdx);

                                                const selectedText =
                                                  selectedIdx >= 0 && options[selectedIdx]
                                                    ? options[selectedIdx]
                                                    : selectedIdx === -1
                                                    ? 'Not Answered'
                                                    : `Option ${selectedIdx + 1}`;
                                                const correctText =
                                                  correctIdx >= 0 && options[correctIdx]
                                                    ? options[correctIdx]
                                                    : `Option ${correctIdx + 1}`;

                                                return (
                                                  <div
                                                    key={qIdx}
                                                    className={`p-4 rounded-xl border ${
                                                      isCorrect
                                                        ? 'bg-emerald-50/40 border-emerald-200'
                                                        : 'bg-rose-50/40 border-rose-200'
                                                    }`}
                                                  >
                                                    <div className="flex justify-between items-start font-semibold text-slate-900 mb-2">
                                                      <span>
                                                        Q{qIdx + 1}: {qText}
                                                      </span>
                                                      <span
                                                        className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ml-2 ${
                                                          isCorrect
                                                            ? 'bg-emerald-200 text-emerald-800'
                                                            : 'bg-rose-200 text-rose-800'
                                                        }`}
                                                      >
                                                        {isCorrect ? '✔ Correct' : '✖ Wrong'}
                                                      </span>
                                                    </div>
                                                    <div className="text-xs space-y-1 text-slate-700 mt-2">
                                                      <p>
                                                        <span className="font-bold">Student Selected:</span>{' '}
                                                        <span
                                                          className={
                                                            isCorrect
                                                              ? 'text-emerald-700 font-medium'
                                                              : 'text-rose-700 font-medium'
                                                          }
                                                        >
                                                          {selectedText}
                                                        </span>
                                                      </p>
                                                      {!isCorrect && (
                                                        <p>
                                                          <span className="font-bold text-emerald-700">
                                                            Correct Answer:
                                                          </span>{' '}
                                                          <span className="font-medium text-emerald-800">
                                                            {correctText}
                                                          </span>
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
