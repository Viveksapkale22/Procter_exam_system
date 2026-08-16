import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import ExamScreen from './pages/ExamScreen';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-lg font-bold tracking-wide">Proctor Exam</Link>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-200">{user.name}</span>
              <button
                onClick={logout}
                className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/exam/:examId" element={<ExamScreen />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
