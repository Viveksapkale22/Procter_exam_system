import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/');
      return;
    }

    const fetchExams = async () => {
      try {
        const response = await axios.get(`${API_BASE}/exams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExams(response.data);
      } catch (error) {
        console.error('Failed to fetch exams', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [user, navigate, token]);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="text-xl font-semibold text-slate-900">Welcome, {user?.name}</h2>
        <p className="mt-2 text-sm text-slate-500">Roll Number: {user?.rollNumber}</p>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-lg font-semibold">Available Exams</h3>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : exams.length === 0 ? (
          <p className="text-sm text-slate-500">No exams are currently available.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam._id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{exam.title}</p>
                  <p className="text-xs text-slate-500">Duration: {exam.durationSeconds / 60} mins</p>
                </div>
                <button
                  onClick={() => navigate(`/student/exam/${exam._id}`)}
                  disabled={exam.isLocked}
                  className={`rounded-lg px-4 py-2 font-medium text-white ${
                    exam.isLocked ? 'cursor-not-allowed bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {exam.isLocked ? 'Locked' : 'Start Exam'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
