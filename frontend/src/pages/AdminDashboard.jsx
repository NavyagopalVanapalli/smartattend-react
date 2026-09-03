import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard({ darkMode, setDarkMode }) {
  // Navigation & Data States
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'faculty' | 'analytics'
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Search Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  // Modals for Viewing Extended Profiles
  const [viewingStudentModal, setViewingStudentModal] = useState(null);
  const [viewingTeacherModal, setViewingTeacherModal] = useState(null);

  // Modals for Adding New Records
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);

  // Form States
  const [newStudent, setNewStudent] = useState({
    roll_no: '',
    full_name: '',
    parent_phone: '',
    dept_code: 'MCA',
    year_level: '1st Year',
    section: 'Sec A'
  });

  const [newTeacher, setNewTeacher] = useState({
    teacher_id: '',
    full_name: '',
    email: '',
    phone: '',
    dept_code: 'MCA',
    password_hash: 'admin123'
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes, teachersRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/students-list'),
        axios.get('/api/admin/teachers-list')
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
      if (teachersRes.data) setTeachers(teachersRes.data);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/students', newStudent);
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Student added successfully!' });
        setShowAddStudentModal(false);
        setNewStudent({ roll_no: '', full_name: '', parent_phone: '', dept_code: 'MCA', year_level: '1st Year', section: 'Sec A' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: `❌ ${err.response?.data?.message || 'Failed to add student'}` });
    }
  };

  const handleDeleteStudent = async (rollNo, deptCode) => {
    if (!window.confirm(`Delete student ${rollNo}? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/students/delete?roll_no=${rollNo}&dept_code=${deptCode}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: '🗑️ Student deleted successfully' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to delete student' });
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/teachers', newTeacher);
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Faculty added successfully!' });
        setShowAddTeacherModal(false);
        setNewTeacher({ teacher_id: '', full_name: '', email: '', phone: '', dept_code: 'MCA', password_hash: 'admin123' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: `❌ ${err.response?.data?.message || 'Failed to add faculty'}` });
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm(`Delete faculty member ${teacherId}?`)) return;
    try {
      const res = await axios.delete(`/api/admin/teachers/delete?teacher_id=${teacherId}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: '🗑️ Faculty removed successfully' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: '❌ Failed to remove faculty' });
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.roll_no.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.dept_code.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.teacher_id.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.dept_code.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh' }}>
      
      {/* TOP BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>🛡️ Admin Management Console</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Institutional Academic & Attendance Management</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {setDarkMode && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 14px', borderRadius: '10px' }}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          )}
          <button
            onClick={() => { localStorage.removeItem('admin_session'); window.location.href = '/admin-login'; }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '8px 14px', borderRadius: '10px', color: '#ef4444' }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: '600',
          fontSize: '0.88rem',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* METRIC OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL STUDENTS</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: '#6366f1' }}>{stats.totalStudents}</h3>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #a855f7' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>ACTIVE FACULTY</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: '#a855f7' }}>{stats.totalTeachers}</h3>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TODAY'S PRESENT</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: '#10b981' }}>{stats.todayPresent}</h3>
        </div>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TODAY'S ABSENT</span>
          <h3 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', color: '#ef4444' }}>{stats.todayAbsent}</h3>
        </div>
      </div>

      {/* TAB CONTROLS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'students' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'students' ? '#ffffff' : 'var(--text-muted)'
          }}
        >
          👨‍🎓 Students Directory
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'faculty' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'faculty' ? '#ffffff' : 'var(--text-muted)'
          }}
        >
          👨‍🏫 Faculty Directory
        </button>
      </div>

      {/* ============================== TAB 1: STUDENTS ============================== */}
      {activeTab === 'students' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search student by name, roll number, or department..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', minWidth: '320px', fontSize: '0.88rem' }}
            />
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.88rem' }}
            >
              + Add New Student
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Roll No</th>
                  <th style={{ padding: '12px' }}>Student Name (Click for Profile)</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Year & Section</th>
                  <th style={{ padding: '12px' }}>Parent Phone</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{s.roll_no}</td>
                      
                      {/* CLICKABLE STUDENT NAME (FEATURE 1) */}
                      <td
                        onClick={() => setViewingStudentModal(s)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          color: '#818cf8',
                          fontWeight: '700',
                          textDecoration: 'underline'
                        }}
                        title="Click to view academic & project portfolio"
                      >
                        {s.full_name} ℹ️
                      </td>

                      <td style={{ padding: '12px' }}>{s.dept_code}</td>
                      <td style={{ padding: '12px' }}>{s.year_level} - {s.section}</td>
                      <td style={{ padding: '12px' }}>{s.parent_phone}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteStudent(s.roll_no, s.dept_code)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== TAB 2: FACULTY ============================== */}
      {activeTab === 'faculty' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search faculty by name, ID, or department..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', minWidth: '320px', fontSize: '0.88rem' }}
            />
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.88rem' }}
            >
              + Add New Faculty
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Faculty ID</th>
                  <th style={{ padding: '12px' }}>Faculty Name (Click for Profile)</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Email Address</th>
                  <th style={{ padding: '12px' }}>WhatsApp Phone</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No faculty members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((t) => (
                    <tr key={t._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{t.teacher_id}</td>
                      
                      {/* CLICKABLE FACULTY NAME (FEATURE 2) */}
                      <td
                        onClick={() => setViewingTeacherModal(t)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          color: '#818cf8',
                          fontWeight: '700',
                          textDecoration: 'underline'
                        }}
                        title="Click to view teaching experience & subjects"
                      >
                        {t.full_name} ℹ️
                      </td>

                      <td style={{ padding: '12px' }}>{t.dept_code}</td>
                      <td style={{ padding: '12px' }}>{t.email}</td>
                      <td style={{ padding: '12px' }}>{t.phone || 'Not Registered'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteTeacher(t.teacher_id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================== MODALS SECTION ============================== */}

      {/* 1. STUDENT DETAILED PROFILE MODAL */}
      {viewingStudentModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 4px 0' }}>🎓 {viewingStudentModal.full_name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Roll No: {viewingStudentModal.roll_no} • {viewingStudentModal.dept_code} ({viewingStudentModal.year_level || '1st Year'})
            </p>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>📅 Academic Period:</strong>
              <div style={{ fontSize: '0.88rem' }}>{viewingStudentModal.academic_period || '2024 - 2026'}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>💻 Programming Languages Learned:</strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {(viewingStudentModal.programming_languages && viewingStudentModal.programming_languages.length > 0)
                  ? viewingStudentModal.programming_languages.map((lang, idx) => (
                      <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                        {lang}
                      </span>
                    ))
                  : ['Python', 'JavaScript', 'React.js', 'MySQL'].map((lang, idx) => (
                      <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                        {lang}
                      </span>
                    ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>🚀 Projects Built Till Now:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.82rem' }}>
                {(viewingStudentModal.projects && viewingStudentModal.projects.length > 0)
                  ? viewingStudentModal.projects.map((proj, idx) => <li key={idx}>{proj}</li>)
                  : (
                    <>
                      <li>Smart Attendance System with GPS Geofencing</li>
                      <li>E-Commerce Cart Management Web App</li>
                    </>
                  )}
              </ul>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>🏆 Certificates Received in College:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.82rem' }}>
                {(viewingStudentModal.certificates && viewingStudentModal.certificates.length > 0)
                  ? viewingStudentModal.certificates.map((cert, idx) => <li key={idx}>{cert}</li>)
                  : (
                    <>
                      <li>Full-Stack Web Development Bootcamp Certificate</li>
                      <li>College Technical Fest - 1st Prize Web Designing</li>
                    </>
                  )}
              </ul>
            </div>

            <button onClick={() => setViewingStudentModal(null)} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
              Close Student Details
            </button>
          </div>
        </div>
      )}

      {/* 2. TEACHER DETAILED PROFILE MODAL */}
      {viewingTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 4px 0' }}>👨‍🏫 {viewingTeacherModal.full_name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Faculty ID: {viewingTeacherModal.teacher_id} • Dept: {viewingTeacherModal.dept_code} • {viewingTeacherModal.email}
            </p>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>⏳ Total Teaching Experience:</strong>
              <div style={{ fontSize: '0.88rem' }}>{viewingTeacherModal.total_experience || '6+ Years'}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>🏛️ Previous Colleges Taught:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.82rem' }}>
                {(viewingTeacherModal.previous_colleges && viewingTeacherModal.previous_colleges.length > 0)
                  ? viewingTeacherModal.previous_colleges.map((col, idx) => <li key={idx}>{col}</li>)
                  : (
                    <>
                      <li>Sri Vishnu Institute of Technology (2020 - 2023)</li>
                      <li>JNTU College of Engineering (2018 - 2020)</li>
                    </>
                  )}
              </ul>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>📖 Known Subjects:</strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {(viewingTeacherModal.known_subjects && viewingTeacherModal.known_subjects.length > 0)
                  ? viewingTeacherModal.known_subjects.map((subj, idx) => (
                      <span key={idx} style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                        {subj}
                      </span>
                    ))
                  : ['Data Structures', 'Database Management', 'Python', 'Cloud Computing', 'Operating Systems'].map((subj, idx) => (
                      <span key={idx} style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                        {subj}
                      </span>
                    ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>🏫 Currently Teaching Subjects:</strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                {(viewingTeacherModal.current_teaching_subjects && viewingTeacherModal.current_teaching_subjects.length > 0)
                  ? viewingTeacherModal.current_teaching_subjects.map((subj, idx) => (
                      <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                        {subj}
                      </span>
                    ))
                  : ['Web Application Development', 'DBMS Lab (MCA 1st Year)'].map((subj, idx) => (
                      <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>
                        {subj}
                      </span>
                    ))}
              </div>
            </div>

            <button onClick={() => setViewingTeacherModal(null)} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
              Close Faculty Details
            </button>
          </div>
        </div>
      )}

      {/* 3. ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>+ Register New Student</h3>
            <form onSubmit={handleAddStudent}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. 2585351122"
                  value={newStudent.roll_no}
                  onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Department</label>
                  <select
                    value={newStudent.dept_code}
                    onChange={(e) => setNewStudent({ ...newStudent, dept_code: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="MCA">MCA</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Year Level</label>
                  <select
                    value={newStudent.year_level}
                    onChange={(e) => setNewStudent({ ...newStudent, year_level: e.target.value })}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Parent Phone (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newStudent.parent_phone}
                  onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Save Student</button>
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADD FACULTY MODAL */}
      {showAddTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>+ Add Faculty Member</h3>
            <form onSubmit={handleAddTeacher}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Faculty ID</label>
                <input
                  type="text"
                  placeholder="e.g. FAC202"
                  value={newTeacher.teacher_id}
                  onChange={(e) => setNewTeacher({ ...newTeacher, teacher_id: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Alice"
                  value={newTeacher.full_name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  placeholder="e.g. alice@college.edu"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>WhatsApp Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Save Faculty</button>
                <button type="button" onClick={() => setShowAddTeacherModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}