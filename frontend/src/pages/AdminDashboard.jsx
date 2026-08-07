import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0 });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const [showTeacherPassword, setShowTeacherPassword] = useState(false);

  const [teacherForm, setTeacherForm] = useState({ 
    teacher_id: '', full_name: '', email: '', phone: '', password_hash: '', dept_code: '' 
  });
  
  const [studentForm, setStudentForm] = useState({ 
    roll_no: '', full_name: '', dept_code: '', parent_phone: '' 
  });

  const activeAdmin = JSON.parse(sessionStorage.getItem("activeAdmin") || "{}");

  useEffect(() => {
    if (sessionStorage.getItem("isAdminLoggedIn") !== "true") {
      navigate('/admin-login');
      return;
    }
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const resStats = await axios.get('/api/admin/stats');
      const resTeachers = await axios.get('/api/admin/teachers-list');
      const resStudents = await axios.get('/api/admin/students-list');

      setStats(resStats.data);
      setTeachers(resTeachers.data);
      setStudents(resStudents.data);
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/teachers', teacherForm);
      alert("✅ Faculty added successfully!");
      setTeacherForm({ teacher_id: '', full_name: '', email: '', phone: '', password_hash: '', dept_code: '' });
      fetchAdminData();
    } catch (err) {
      alert("Error adding faculty");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/students', studentForm);
      alert("✅ Student added successfully!");
      setStudentForm({ roll_no: '', full_name: '', dept_code: '', parent_phone: '' });
      fetchAdminData();
    } catch (err) {
      alert("Error adding student");
    }
  };

  const handleDeleteTeacher = async (teacher_id) => {
    if (!confirm(`Delete Faculty ID: ${teacher_id}?`)) return;
    try {
      await axios.delete(`/api/admin/teachers/delete?teacher_id=${teacher_id}`);
      fetchAdminData();
    } catch (err) {
      alert("Error deleting faculty");
    }
  };

  const handleDeleteStudent = async (roll_no, dept_code) => {
    if (!confirm(`Delete student ${roll_no}?`)) return;
    try {
      await axios.delete(`/api/students/delete?roll_no=${roll_no}&dept_code=${dept_code}`);
      fetchAdminData();
    } catch (err) {
      alert("Error deleting student");
    }
  };

  const cardContainerStyle = {
    background: darkMode ? 'rgba(30, 27, 75, 0.65)' : 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
    color: darkMode ? '#f8fafc' : '#1e293b'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: darkMode ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
    color: darkMode ? '#ffffff' : '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '0.9rem',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: darkMode ? '#94a3b8' : '#64748b',
    marginBottom: '6px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' : '#e0eafc',
      padding: '25px 5%',
      transition: 'all 0.3s ease'
    }}>
      
      {/* TOP NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ borderRadius: '12px', padding: '8px 16px' }}>
          ⬅ Back to Login
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary" style={{ borderRadius: '12px', padding: '8px 16px' }}>
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button onClick={() => { sessionStorage.clear(); navigate('/admin-login'); }} className="btn btn-danger" style={{ borderRadius: '12px', padding: '8px 16px' }}>
            🔒 Logout
          </button>
        </div>
      </div>

      {/* PAGE HEADER */}
      <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '20px', color: darkMode ? '#ffffff' : '#1e293b' }}>
        ⚡ Admin Dashboard
        <span style={{ fontSize: '0.88rem', fontWeight: 'normal', color: darkMode ? '#94a3b8' : '#64748b', display: 'block', marginTop: '4px' }}>
          Welcome, <strong>{activeAdmin.full_name || 'System Administrator'}</strong> ({activeAdmin.admin_id || 'admin'})
        </span>
      </h1>

      {/* STATS HORIZONTAL GRID (4 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '24px' }}>
        <div style={{ ...cardContainerStyle, textAlign: 'center', marginBottom: 0 }}>
          <h4 style={labelStyle}>TOTAL STUDENTS</h4>
          <p style={{ fontSize: '2.2rem', fontWeight: '800', color: '#38bdf8' }}>{stats.totalStudents}</p>
        </div>
        <div style={{ ...cardContainerStyle, textAlign: 'center', marginBottom: 0 }}>
          <h4 style={labelStyle}>TOTAL FACULTY</h4>
          <p style={{ fontSize: '2.2rem', fontWeight: '800', color: '#818cf8' }}>{stats.totalTeachers}</p>
        </div>
        <div style={{ ...cardContainerStyle, textAlign: 'center', marginBottom: 0 }}>
          <h4 style={labelStyle}>TODAY PRESENT</h4>
          <p style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399' }}>{stats.todayPresent}</p>
        </div>
        <div style={{ ...cardContainerStyle, textAlign: 'center', marginBottom: 0 }}>
          <h4 style={labelStyle}>TODAY ABSENT</h4>
          <p style={{ fontSize: '2.2rem', fontWeight: '800', color: '#f87171' }}>{stats.todayAbsent}</p>
        </div>
      </div>

      {/* ADD FACULTY (HORIZONTAL LAYOUT) */}
      <div style={cardContainerStyle}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>👨‍🏫 Add New Faculty</h3>
        <form onSubmit={handleAddTeacher} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 140px', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Teacher ID</label>
            <input style={inputStyle} placeholder="e.g. T101" value={teacherForm.teacher_id} onChange={e => setTeacherForm({...teacherForm, teacher_id: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} placeholder="Dr. Smith" value={teacherForm.full_name} onChange={e => setTeacherForm({...teacherForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" placeholder="smith@college.edu" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Phone (WhatsApp)</label>
            <input style={inputStyle} placeholder="9876543210" maxLength="10" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <div className="pwd-wrapper">
              <input style={inputStyle} type={showTeacherPassword ? "text" : "password"} placeholder="••••••••" value={teacherForm.password_hash} onChange={e => setTeacherForm({...teacherForm, password_hash: e.target.value})} required />
              <button type="button" className="toggle-pwd-btn" onClick={() => setShowTeacherPassword(!showTeacherPassword)}>
                <i className={`fa-solid ${showTeacherPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 0', borderRadius: '12px', fontWeight: '700' }}>
            Add Faculty
          </button>
        </form>
      </div>

      {/* ADD STUDENT (HORIZONTAL LAYOUT) */}
      <div style={cardContainerStyle}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>🎓 Add New Student</h3>
        <form onSubmit={handleAddStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 140px', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Roll Number</label>
            <input style={inputStyle} placeholder="e.g. 21CS01" value={studentForm.roll_no} onChange={e => setStudentForm({...studentForm, roll_no: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} placeholder="Jane Smith" value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Department</label>
            <input style={inputStyle} placeholder="CSE" value={studentForm.dept_code} onChange={e => setStudentForm({...studentForm, dept_code: e.target.value})} required />
          </div>
          <div>
            <label style={labelStyle}>Parent Phone</label>
            <input style={inputStyle} placeholder="9876543210" maxLength="10" value={studentForm.parent_phone} onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 0', borderRadius: '12px', fontWeight: '700' }}>
            Add Student
          </button>
        </form>
      </div>

      {/* FACULTY DIRECTORY */}
      <div style={cardContainerStyle}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>👨‍🏫 Registered Faculty Directory</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px' }}>TEACHER ID</th>
                <th style={{ padding: '12px' }}>FULL NAME</th>
                <th style={{ padding: '12px' }}>EMAIL</th>
                <th style={{ padding: '12px' }}>PHONE</th>
                <th style={{ padding: '12px' }}>DEPARTMENT</th>
                <th style={{ padding: '12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '15px' }}>No faculty members found.</td></tr>
              ) : (
                teachers.map(t => (
                  <tr key={t.teacher_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: '12px' }}><b>{t.teacher_id}</b></td>
                    <td style={{ padding: '12px' }}>{t.full_name}</td>
                    <td style={{ padding: '12px' }}>{t.email || '-'}</td>
                    <td style={{ padding: '12px' }}>{t.phone || '-'}</td>
                    <td style={{ padding: '12px' }}>{t.dept_code}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDeleteTeacher(t.teacher_id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DIRECTORY */}
      <div style={cardContainerStyle}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>🎓 Registered Student Directory</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px' }}>ROLL NO</th>
                <th style={{ padding: '12px' }}>FULL NAME</th>
                <th style={{ padding: '12px' }}>PARENT PHONE</th>
                <th style={{ padding: '12px' }}>DEPARTMENT</th>
                <th style={{ padding: '12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>No registered students found.</td></tr>
              ) : (
                students.map(s => (
                  <tr key={s.roll_no} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: '12px' }}><b>{s.roll_no}</b></td>
                    <td style={{ padding: '12px' }}>{s.full_name}</td>
                    <td style={{ padding: '12px' }}>{s.parent_phone}</td>
                    <td style={{ padding: '12px' }}>{s.dept_code}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDeleteStudent(s.roll_no, s.dept_code)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}