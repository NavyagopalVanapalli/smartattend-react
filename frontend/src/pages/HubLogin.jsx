import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function HubLogin() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [rollNo, setRollNo] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.get(`/api/student/verify?roll_no=${rollNo.trim()}`);
      if (res.data && res.data.success) {
        localStorage.setItem("hub_user", JSON.stringify({
          role: 'student',
          name: res.data.student.full_name,
          id: res.data.student.roll_no,
          dept: res.data.student.dept_code,
          year: res.data.student.year_level
        }));
        navigate('/hub');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Roll number not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/login', {
        teacherId: teacherId.trim(),
        password: password.trim()
      });
      if (res.data && res.data.success) {
        localStorage.setItem("hub_user", JSON.stringify({
          role: 'faculty',
          name: res.data.teacher.full_name,
          id: res.data.teacher.teacher_id,
          dept: res.data.teacher.dept_code
        }));
        navigate('/hub');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Faculty credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '40px auto', padding: '20px 16px', minHeight: '80vh' }}>
      <div className="card" style={{ padding: '30px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏛️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0' }}>Academic Hub Login</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Access campus syllabus PDFs, technical expos, and quizzes
        </p>

        {/* ROLE TOGGLE */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => { setRole('student'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.82rem',
              background: role === 'student' ? 'var(--primary)' : 'transparent',
              color: role === 'student' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            👨‍🎓 Student
          </button>
          <button
            type="button"
            onClick={() => { setRole('teacher'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.82rem',
              background: role === 'teacher' ? 'var(--primary)' : 'transparent',
              color: role === 'teacher' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            👨‍🏫 Faculty
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {role === 'student' ? (
          <form onSubmit={handleStudentLogin}>
            <input
              type="text"
              placeholder="Enter Roll Number (e.g. 2585351122)"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '700' }}
              required
            />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '10px' }}>
              {loading ? 'Verifying...' : 'Access Hub as Student →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTeacherLogin}>
            <input
              type="text"
              placeholder="Faculty ID (e.g. FAC101)"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', marginBottom: '12px' }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', marginBottom: '16px' }}
              required
            />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '10px' }}>
              {loading ? 'Logging in...' : 'Access Hub as Faculty →'}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '12px', padding: '10px', fontSize: '0.82rem' }}
        >
          ← Return to Student Attendance
        </button>
      </div>
    </div>
  );
}