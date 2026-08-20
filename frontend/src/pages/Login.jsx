import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '',
    rollNumber: '',
    department: '',
    password: '',
    role: 'student',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        rollNumber: form.rollNumber,
        password: form.password,
      });

      login({
        userData: response.data.user,
        authToken: response.data.token,
      });
    } catch (loginError) {
      const fallback = 'Login failed. If this is first-time access, create a profile through the registration form below.';
      setError(loginError.response?.data?.message || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/auth/register`, form);
      login({
        userData: response.data.user,
        authToken: response.data.token,
      });
    } catch (registrationError) {
      setError(registrationError.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Student / Admin Login</h1>
        <p className="mb-6 text-sm text-slate-500">Secure mobile-first exam access.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full name"
            className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
          />
          <input
            name="rollNumber"
            value={form.rollNumber}
            onChange={handleChange}
            placeholder="Roll number"
            className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
          />
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="Department"
            className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
          />
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
          />
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-sky-500"
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>

          <p className="text-xs text-slate-500">
            {form.role === 'admin'
              ? 'Admin login is fixed and managed by the server. No public registration is required.'
              : 'Student accounts can be created here. Admin accounts are pre-configured securely.'}
          </p>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {isLoading ? 'Loading...' : 'Login'}
            </button>
            {form.role === 'student' ? (
              <button
                type="button"
                onClick={handleRegister}
                disabled={isLoading}
                className="flex-1 rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                Register
              </button>
            ) : (
              <div className="flex-1 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-600">
                Fixed admin
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
