import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function ExamScreen() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [statusMessage, setStatusMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/');
      return;
    }

    const fetchExam = async () => {
      try {
        const response = await axios.get(`${API_BASE}/exams/${examId}/start`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setExamData(response.data);
        setTimeLeft(response.data.durationSeconds || 120);
      } catch (error) {
        setStatusMessage(error.response?.data?.message || 'Unable to start exam.');
      }
    };

    fetchExam();
  }, [examId, navigate, token, user]);

  useEffect(() => {
    if (!examData || submitted) {
      return undefined;
    }

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
        setWarningCount((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            submitExam('DISQUALIFIED_CHEATING');
          } else {
            setStatusMessage('Warning: Do not switch tabs or apps during the exam.');
          }
          return next;
        });
      }
    };

    const preventDefaultHandler = (event) => event.preventDefault();

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu', preventDefaultHandler);
    document.addEventListener('copy', preventDefaultHandler);
    document.addEventListener('paste', preventDefaultHandler);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu', preventDefaultHandler);
      document.removeEventListener('copy', preventDefaultHandler);
      document.removeEventListener('paste', preventDefaultHandler);
    };
  }, [examData, submitted]);

  useEffect(() => {
    if (!examData || submitted) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam('AUTO_SUBMITTED_TIMEOUT');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examData, submitted]);

  const currentQuestions = useMemo(() => examData?.questions || [], [examData]);

  const submitExam = async (statusReason = 'SUBMITTED_NORMAL') => {
    if (submitted || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitted(true);

    const payloadAnswers = currentQuestions.map((question, index) => ({
      questionId: question._id,
      questionIndex: index,
      selectedOption: answers[question._id] ?? -1,
    }));

    try {
      await axios.post(
        `${API_BASE}/submissions/submit`,
        {
          examId,
          answers: payloadAnswers,
          tabSwitchCount,
          status: statusReason,
          assignedQuestions: currentQuestions.map((question) => String(question._id)),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      localStorage.clear();
      setExamData(null);
      setStatusMessage(
        statusReason === 'DISQUALIFIED_CHEATING'
          ? 'Test terminated for suspicious behavior.'
          : 'Test submitted successfully.'
      );
    } catch (error) {
      setStatusMessage('Submission failed. Please contact the admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  if (!examData) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-semibold">Exam Status</h2>
        <p className="mt-3 text-sm text-slate-600">{statusMessage || 'Preparing your exam...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{examData.title}</h2>
            <p className="text-xs text-slate-500">Student: {user?.name}</p>
          </div>
          <div className="rounded-xl bg-rose-100 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wide text-rose-700">Time Left</p>
            <p className="text-xl font-bold text-rose-700">{Math.max(0, timeLeft)}s</p>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {statusMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {currentQuestions.map((question, index) => (
          <div key={question._id || `${question.questionText}-${index}`} className="card p-4">
            <p className="mb-3 font-medium text-slate-800">
              {index + 1}. {question.questionText}
            </p>
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <button
                  key={`${question._id}-${optionIndex}`}
                  type="button"
                  onClick={() => handleAnswerSelect(question._id, optionIndex)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${
                    answers[question._id] === optionIndex
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}.</span>
                  <span className="flex-1 pl-3">{option}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 pb-2">
        <button
          type="button"
          onClick={() => submitExam('SUBMITTED_NORMAL')}
          className="w-full rounded-xl bg-slate-900 px-4 py-4 text-base font-semibold text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  );
}
