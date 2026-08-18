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
      <div className="card p-5 bg-white shadow-sm border border-slate-200 rounded-xl">
        <h2 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Roll Number: {user?.rollNumber}</p>
      </div>

      <div className="card p-6 bg-white shadow-sm border border-slate-200 rounded-xl">
        <h3 className="mb-6 text-xl font-bold text-slate-800 border-b pb-3">Available Exams</h3>

        {loading ? (
          <p className="text-sm font-medium text-slate-500">Loading exams...</p>
        ) : exams.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">No exams are currently available.</p>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div key={exam._id} className="flex flex-col md:flex-row md:items-center justify-between rounded-xl border border-slate-200 p-5 hover:bg-slate-50 transition-colors gap-4">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{exam.title}</h4>
                  {/* Rendering Subject Here */}
                  <p className="text-sm font-bold text-sky-600 mt-1">{exam.subject}</p>
                  <p className="text-xs font-medium text-slate-500 mt-2">Duration: {exam.durationSeconds / 60} mins</p>
                </div>
                <button
                  onClick={() => navigate(`/student/exam/${exam._id}`)}
                  disabled={exam.isLocked}
                  className={`rounded-xl px-6 py-3 font-bold text-white shadow-sm w-full md:w-auto transition-all ${
                    exam.isLocked ? 'cursor-not-allowed bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {exam.isLocked ? 'Currently Locked' : 'Start Exam'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}