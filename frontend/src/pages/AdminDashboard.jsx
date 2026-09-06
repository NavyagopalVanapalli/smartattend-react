import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard({ darkMode, setDarkMode }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [selectedEventRoster, setSelectedEventRoster] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  const [viewingStudentModal, setViewingStudentModal] = useState(null);
  const [viewingTeacherModal, setViewingTeacherModal] = useState(null);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);

  const [newEvent, setNewEvent] = useState({
    type: 'Project Expo',
    title: '',
    date: '',
    venue: '',
    eligible: 'All Students & Faculty',
    badgeColor: '#6366f1',
    description: ''
  });

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
    const isLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
    if (!isLoggedIn) {
      window.location.href = '/admin-login';
    } else {
      fetchDashboardData();
      fetchEventsAndRegistrations();
    }
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

  const fetchLeaves = async () => {
    try {
      const res = await axios.get('/api/admin/leaves');
      if (res.data && res.data.success) {
        setLeaveRequests(res.data.leaves);
      }
    } catch (err) {
      console.error('Error fetching admin leaves:', err);
    }
  };

  const fetchEventsAndRegistrations = async () => {
    try {
      const [eventsRes, regsRes] = await Promise.all([
        axios.get('/api/events'),
        axios.get('/api/admin/event-registrations')
      ]);
      if (eventsRes.data && eventsRes.data.success) {
        setEventsList(eventsRes.data.events);
      }
      if (regsRes.data && regsRes.data.success) {
        setEventRegistrations(regsRes.data.registrations);
      }
    } catch (err) {
      console.error('Error fetching events or registrations:', err);
    }
  };

  const handleReviewLeave = async (leaveId, status) => {
    try {
      const res = await axios.put('/api/admin/leaves/review', { leaveId, status });
      if (res.data && res.data.success) {
        setMessage({ type: 'success', text: `Application ${status.toLowerCase()} successfully!` });
        fetchLeaves();
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error updating leave application.' });
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/events', newEvent);
      if (res.data.success) {
        setMessage({ type: 'success', text: '🎯 Campus Event published to Academic Hub!' });
        setShowAddEventModal(false);
        setNewEvent({
          type: 'Project Expo',
          title: '',
          date: '',
          venue: '',
          eligible: 'All Students & Faculty',
          badgeColor: '#6366f1',
          description: ''
        });
        fetchEventsAndRegistrations();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add event.' });
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Remove this event from Academic Hub?')) return;
    try {
      await axios.delete(`/api/admin/events/${id}`);
      setMessage({ type: 'success', text: 'Event removed successfully.' });
      fetchEventsAndRegistrations();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete event.' });
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/students', newStudent);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Student added successfully!' });
        setShowAddStudentModal(false);
        setNewStudent({ roll_no: '', full_name: '', parent_phone: '', dept_code: 'MCA', year_level: '1st Year', section: 'Sec A' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: `${err.response?.data?.message || 'Failed to add student'}` });
    }
  };

  const handleDeleteStudent = async (rollNo, deptCode) => {
    if (!window.confirm(`Delete student ${rollNo}? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/students/delete?roll_no=${rollNo}&dept_code=${deptCode}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Student deleted successfully' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete student' });
    }
  };

  const handleSaveEditStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('/api/admin/students/extended-update', editingStudent);
      if (res.data.success) {
        setMessage({ type: 'success', text: `Student ${editingStudent.roll_no} updated successfully!` });
        setEditingStudent(null);
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: `${err.response?.data?.message || 'Failed to update student'}` });
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/admin/teachers', newTeacher);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Faculty added successfully!' });
        setShowAddTeacherModal(false);
        setNewTeacher({ teacher_id: '', full_name: '', email: '', phone: '', dept_code: 'MCA', password_hash: 'admin123' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: `${err.response?.data?.message || 'Failed to add faculty'}` });
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm(`Delete faculty member ${teacherId}?`)) return;
    try {
      const res = await axios.delete(`/api/admin/teachers/delete?teacher_id=${teacherId}`);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Faculty removed successfully' });
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove faculty' });
    }
  };

  const handleSaveEditTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('/api/admin/teachers/extended-update', editingTeacher);
      if (res.data.success) {
        setMessage({ type: 'success', text: `Faculty ${editingTeacher.teacher_id} updated successfully!` });
        setEditingTeacher(null);
        fetchDashboardData();
      }
    } catch (err) {
      setMessage({ type: 'error', text: `${err.response?.data?.message || 'Failed to update faculty'}` });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("activeAdmin");
    window.location.href = '/admin-login';
  };

  const getRegistrationsForEvent = (eventId) => {
    return eventRegistrations.filter(r => String(r.eventId) === String(eventId));
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderRadius: '16px',
        background: darkMode ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: '#ffffff',
            boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)'
          }}>
            ⚡
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.3px', color: 'var(--text-main)' }}>
              Executive Control Center
            </h2>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Logged in as <strong style={{ color: '#6366f1' }}>System Administrator</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.86rem',
              fontWeight: '700',
              border: '1px solid var(--glass-border)',
              background: darkMode ? 'rgba(255,255,255,0.08)' : '#f8fafc',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            ← Attendance Register
          </button>

          <button
            onClick={() => window.location.href = '/hub'}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.86rem',
              fontWeight: '700',
              border: '1px solid var(--glass-border)',
              background: darkMode ? 'rgba(255,255,255,0.08)' : '#f8fafc',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            🏛️ Campus Hub
          </button>

          {setDarkMode && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: '700',
                border: '1px solid var(--glass-border)',
                background: darkMode ? 'rgba(255,255,255,0.08)' : '#f8fafc',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.86rem',
              fontWeight: '700',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            🔒 Logout
          </button>
        </div>
      </div>

      {/* FLOATING TOAST NOTIFICATION */}
      {message && (
        <div className="toast-bottom-left" style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 99999,
          maxWidth: '420px',
          width: 'calc(100vw - 48px)'
        }}>
          <div
            style={{
              padding: '14px 20px',
              borderRadius: '16px',
              fontWeight: '600',
              fontSize: '0.9rem',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: message.type === 'success' 
                ? (darkMode ? 'rgba(16, 185, 129, 0.25)' : '#10b981')
                : (darkMode ? 'rgba(239, 68, 68, 0.25)' : '#ef4444'),
              color: '#ffffff',
              border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>
                {message.type === 'success' ? '⚡' : '⚠️'}
              </span>
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '1rem',
                padding: '2px 6px',
                opacity: 0.85
              }}
            >
              ✕
            </button>
          </div>
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

      {/* TABS CONTROLLER */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', flexWrap: 'wrap', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeTab === 'students' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'students' ? '#ffffff' : 'var(--text-muted)'
          }}
        >
          👨‍🎓 Students Directory
        </button>
        <button
          onClick={() => setActiveTab('faculty')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeTab === 'faculty' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'faculty' ? '#ffffff' : 'var(--text-muted)'
          }}
        >
          👨‍🏫 Faculty Directory
        </button>
        <button
          onClick={() => { setActiveTab('leaves'); fetchLeaves(); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeTab === 'leaves' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'leaves' ? '#ffffff' : 'var(--text-muted)'
          }}
        >
          📄 OD & Leave Approvals
        </button>
        <button
          onClick={() => { setActiveTab('events'); fetchEventsAndRegistrations(); }}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeTab === 'events' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'events' ? '#ffffff' : 'var(--text-muted)'
          }}
        >
          🎯 Campus Events & Expos
        </button>
      </div>

      {/* TAB 1: STUDENTS */}
      {activeTab === 'students' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search student by name, roll number, or department..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: '10px', minWidth: '300px', fontSize: '0.88rem' }}
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
                  <th style={{ padding: '12px' }}>Student Name</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Year & Section</th>
                  <th style={{ padding: '12px' }}>Parent Phone</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{s.roll_no}</td>
                    <td
                      onClick={() => setViewingStudentModal(s)}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        color: '#818cf8',
                        fontWeight: '700',
                        textDecoration: 'underline'
                      }}
                    >
                      {s.full_name} ℹ️
                    </td>
                    <td style={{ padding: '12px' }}>{s.dept_code}</td>
                    <td style={{ padding: '12px' }}>{s.year_level} - {s.section}</td>
                    <td style={{ padding: '12px' }}>{s.parent_phone}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => setEditingStudent(s)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#6366f1' }}>Edit</button>
                        <button onClick={() => handleDeleteStudent(s.roll_no, s.dept_code)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY */}
      {activeTab === 'faculty' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search faculty by name, ID, or department..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              style={{ padding: '10px 16px', borderRadius: '10px', minWidth: '300px', fontSize: '0.88rem' }}
            />
            <button onClick={() => setShowAddTeacherModal(true)} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem' }}>+ Add New Faculty</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Faculty ID</th>
                  <th style={{ padding: '12px' }}>Faculty Name</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Email Address</th>
                  <th style={{ padding: '12px' }}>WhatsApp Phone</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{t.teacher_id}</td>
                    <td onClick={() => setViewingTeacherModal(t)} style={{ padding: '12px', cursor: 'pointer', color: '#818cf8', fontWeight: '700', textDecoration: 'underline' }}>{t.full_name} ℹ️</td>
                    <td style={{ padding: '12px' }}>{t.dept_code}</td>
                    <td style={{ padding: '12px' }}>{t.email}</td>
                    <td style={{ padding: '12px' }}>{t.phone || 'Not Registered'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => setEditingTeacher(t)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#6366f1' }}>Edit</button>
                        <button onClick={() => handleDeleteTeacher(t.teacher_id)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVES */}
      {activeTab === 'leaves' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>OD & Medical Leave Requests</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Roll No</th>
                  <th style={{ padding: '12px' }}>Student</th>
                  <th style={{ padding: '12px' }}>Type</th>
                  <th style={{ padding: '12px' }}>Duration</th>
                  <th style={{ padding: '12px' }}>Reason</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((req) => (
                  <tr key={req._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '12px', fontWeight: '700' }}>{req.roll_no}</td>
                    <td style={{ padding: '12px' }}>{req.student_name}</td>
                    <td style={{ padding: '12px' }}>{req.leave_type}</td>
                    <td style={{ padding: '12px' }}>{req.from_date} to {req.to_date}</td>
                    <td style={{ padding: '12px' }}>{req.reason}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {req.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleReviewLeave(req._id, 'Approved')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Approve</button>
                          <button onClick={() => handleReviewLeave(req._id, 'Rejected')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}>Reject</button>
                        </div>
                      ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reviewed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CAMPUS EVENTS & LIVE PARTICIPANT ROSTER */}
      {activeTab === 'events' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🎯 Campus Events & Registrations</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Track student participation numbers and inspect rosters per event</span>
            </div>
            <button
              onClick={() => setShowAddEventModal(true)}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.88rem' }}
            >
              + Add New Event
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {eventsList.length === 0 ? (
              <div className="card" style={{ padding: '30px', textAlign: 'center', gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--text-muted)' }}>No events added yet. Click "+ Add New Event" to publish one.</p>
              </div>
            ) : (
              eventsList.map((ev) => {
                const regs = getRegistrationsForEvent(ev._id);
                return (
                  <div key={ev._id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${ev.badgeColor || '#6366f1'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: `${ev.badgeColor || '#6366f1'}22`,
                        color: ev.badgeColor || '#6366f1'
                      }}>
                        {ev.type}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        📅 {ev.date}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem' }}>{ev.title}</h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                      {ev.description}
                    </p>

                    <div style={{ fontSize: '0.78rem', marginBottom: '4px' }}>
                      <strong>📍 Venue:</strong> {ev.venue}
                    </div>
                    <div style={{ fontSize: '0.78rem', marginBottom: '14px', color: '#a855f7' }}>
                      <strong>🎓 Eligibility:</strong> {ev.eligible}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--glass-border)',
                      marginBottom: '14px'
                    }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>REGISTERED PARTICIPANTS:</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>{regs.length}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedEventRoster({ event: ev, registrations: regs })}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                      >
                        👥 View Registered ({regs.length})
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev._id)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#ef4444' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* EVENT ROSTER VIEWER MODAL */}
      {selectedEventRoster && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '680px', textAlign: 'left', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📋 Registered Participants</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Event: <strong>{selectedEventRoster.event.title}</strong> ({selectedEventRoster.registrations.length} students)
                </span>
              </div>
              <button onClick={() => setSelectedEventRoster(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Roll Number</th>
                    <th style={{ padding: '8px' }}>Student Name</th>
                    <th style={{ padding: '8px' }}>Dept & Year</th>
                    <th style={{ padding: '8px' }}>Contact Phone</th>
                    <th style={{ padding: '8px' }}>Team Name</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEventRoster.registrations.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students have registered for this event yet.
                      </td>
                    </tr>
                  ) : (
                    selectedEventRoster.registrations.map((r) => (
                      <tr key={r._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '8px', fontWeight: '700' }}>{r.rollNo}</td>
                        <td style={{ padding: '8px' }}>{r.studentName}</td>
                        <td style={{ padding: '8px' }}>{r.dept} ({r.year})</td>
                        <td style={{ padding: '8px' }}>{r.phone}</td>
                        <td style={{ padding: '8px' }}>{r.teamName || 'Individual'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={() => setSelectedEventRoster(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '10px' }}>
              Close Roster
            </button>
          </div>
        </div>
      )}

      {/* ADD EVENT MODAL */}
      {showAddEventModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0 }}>+ Publish New Campus Event</h3>
              <button onClick={() => setShowAddEventModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddEvent}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Event Category</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  style={{ width: '100%', padding: '9px' }}
                >
                  <option value="Project Expo">Project Expo</option>
                  <option value="Placement Drive">Placement Drive</option>
                  <option value="Hackathon">Hackathon</option>
                  <option value="College Festival">College Festival</option>
                  <option value="Technical Workshop">Technical Workshop</option>
                </select>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Smart Tech Expo 2026"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{ width: '100%', padding: '9px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Event Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Oct 15, 2026"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    style={{ width: '100%', padding: '9px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Badge Accent Color</label>
                  <select
                    value={newEvent.badgeColor}
                    onChange={(e) => setNewEvent({ ...newEvent, badgeColor: e.target.value })}
                    style={{ width: '100%', padding: '9px' }}
                  >
                    <option value="#6366f1">Indigo (Project Expo)</option>
                    <option value="#10b981">Green (Placement Drive)</option>
                    <option value="#f59e0b">Orange (Hackathon)</option>
                    <option value="#ec4899">Pink (College Festival)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Campus Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Innovation Center, Block C"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  style={{ width: '100%', padding: '9px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Eligibility</label>
                <input
                  type="text"
                  placeholder="e.g. All B.Tech & MCA Students"
                  value={newEvent.eligible}
                  onChange={(e) => setNewEvent({ ...newEvent, eligible: e.target.value })}
                  style={{ width: '100%', padding: '9px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Brief Description</label>
                <textarea
                  rows="2"
                  placeholder="Describe registration requirements, prizes, or agenda"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  style={{ width: '100%', padding: '9px', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Publish Event</button>
                <button type="button" onClick={() => setShowAddEventModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STUDENT DETAILS MODAL */}
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
            <button onClick={() => setViewingStudentModal(null)} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
              Close Student Details
            </button>
          </div>
        </div>
      )}

      {/* VIEW TEACHER DETAILS MODAL */}
      {viewingTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 4px 0' }}>👨‍🏫 {viewingTeacherModal.full_name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Faculty ID: {viewingTeacherModal.teacher_id} • Dept: {viewingTeacherModal.dept_code} • {viewingTeacherModal.email}
            </p>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>⏳ Teaching Experience:</strong>
              <div style={{ fontSize: '0.88rem' }}>{viewingTeacherModal.total_experience || '6+ Years'}</div>
            </div>
            <button onClick={() => setViewingTeacherModal(null)} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
              Close Faculty Details
            </button>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px', textAlign: 'left' }}>
            <h3>✏️ Edit Student Details</h3>
            <form onSubmit={handleSaveEditStudent} style={{ marginTop: '12px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={editingStudent.full_name} onChange={e => setEditingStudent({ ...editingStudent, full_name: e.target.value })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Parent WhatsApp Phone</label>
                <input type="text" value={editingStudent.parent_phone} onChange={e => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })} style={{ width: '100%', padding: '10px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Save Changes</button>
                <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACULTY MODAL */}
      {editingTeacher && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px', textAlign: 'left' }}>
            <h3>✏️ Edit Faculty Details</h3>
            <form onSubmit={handleSaveEditTeacher} style={{ marginTop: '12px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={editingTeacher.full_name} onChange={e => setEditingTeacher({ ...editingTeacher, full_name: e.target.value })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Email</label>
                <input type="email" value={editingTeacher.email} onChange={e => setEditingTeacher({ ...editingTeacher, email: e.target.value })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Save Changes</button>
                <button type="button" onClick={() => setEditingTeacher(null)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>+ Register New Student</h3>
            <form onSubmit={handleAddStudent}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Roll Number</label>
                <input type="text" placeholder="e.g. 2585351122" value={newStudent.roll_no} onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" placeholder="e.g. John Doe" value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>Save Student</button>
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="btn btn-secondary" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FACULTY MODAL */}
      {showAddTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>+ Add Faculty Member</h3>
            <form onSubmit={handleAddTeacher}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Faculty ID</label>
                <input type="text" placeholder="e.g. FAC202" value={newTeacher.teacher_id} onChange={(e) => setNewTeacher({ ...newTeacher, teacher_id: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input type="text" placeholder="e.g. Prof. Alice" value={newTeacher.full_name} onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })} style={{ width: '100%', padding: '10px' }} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Email</label>
                <input type="email" placeholder="e.g. alice@college.edu" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} style={{ width: '100%', padding: '10px' }} required />
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