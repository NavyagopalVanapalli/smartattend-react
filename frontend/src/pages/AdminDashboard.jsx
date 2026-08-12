import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0 });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState(null);

  // Modal States
  const [editTeacher, setEditTeacher] = useState(null);
  const [editStudent, setEditStudent] = useState(null);

  // Forms State
  const [teacherForm, setTeacherForm] = useState({ 
    teacher_id: '', full_name: '', email: '', phone: '', password_hash: '', dept_code: '', branch: '' 
  });
  
  const [studentForm, setStudentForm] = useState({ 
    roll_no: '', full_name: '', dept_code: '', parent_phone: '' 
  });

  // Safe Session Retrieval
  const activeAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeAdmin") || sessionStorage.getItem("activeAdmin") || "{}");
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    const isAuth = localStorage.getItem("isAdminLoggedIn") === "true" || sessionStorage.getItem("isAdminLoggedIn") === "true";
    if (!isAuth) {
      navigate('/admin-login');
      return;
    }
    fetchAdminData();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAdminData = async () => {
    try {
      const resStats = await axios.get('/api/admin/stats');
      const resTeachers = await axios.get('/api/admin/teachers-list');
      const resStudents = await axios.get('/api/admin/students-list');

      setStats(resStats.data || { totalStudents: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0 });
      setTeachers(Array.isArray(resTeachers.data) ? resTeachers.data : []);
      setStudents(Array.isArray(resStudents.data) ? resStudents.data : []);
    } catch (err) {
      console.error("Error loading admin data:", err);
      setTeachers([]);
      setStudents([]);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/teachers', teacherForm);
      showToast(`✨ Faculty ${teacherForm.full_name} registered successfully!`);
      setTeacherForm({ teacher_id: '', full_name: '', email: '', phone: '', password_hash: '', dept_code: '', branch: '' });
      fetchAdminData();
    } catch (err) {
      alert("Error registering faculty member.");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/students', studentForm);
      showToast(`✨ Student ${studentForm.full_name} added successfully!`);
      setStudentForm({ roll_no: '', full_name: '', dept_code: '', parent_phone: '' });
      fetchAdminData();
    } catch (err) {
      alert("Error registering student.");
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (!teacher || !confirm(`Are you sure you want to remove Faculty ID: ${teacher.teacher_id}?`)) return;
    try {
      await axios.delete(`/api/admin/teachers/delete?teacher_id=${teacher.teacher_id}`);
      setTeachers(prev => prev.filter(t => t.teacher_id !== teacher.teacher_id));
      showToast(`🗑️ Removed Faculty: ${teacher.full_name}`);
    } catch (err) {
      alert("Error deleting faculty.");
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!student || !confirm(`Are you sure you want to remove student ${student.roll_no}?`)) return;
    try {
      await axios.delete(`/api/students/delete?roll_no=${student.roll_no}&dept_code=${student.dept_code}`);
      setStudents(prev => prev.filter(s => s.roll_no !== student.roll_no));
      showToast(`🗑️ Removed Student: ${student.full_name} (${student.roll_no})`);
    } catch (err) {
      alert("Error deleting student.");
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/admin/teachers/update', editTeacher);
      fetchAdminData();
      setEditTeacher(null);
      showToast(`✅ Profile updated for ${editTeacher.full_name}`);
    } catch (err) {
      alert("Failed to update faculty details.");
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/admin/students/update', editStudent);
      fetchAdminData();
      setEditStudent(null);
      showToast(`✅ Record updated for ${editStudent.full_name}`);
    } catch (err) {
      alert("Failed to update student details.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    localStorage.removeItem("activeAdmin");
    sessionStorage.clear();
    navigate('/admin-login');
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      
      {/* EXECUTIVE TOP BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'grid', placeItems: 'center', fontSize: '1.4rem', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)' }}>⚡</div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>Executive Control Center</h1>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Logged in as <strong style={{ color: 'var(--primary)' }}>{activeAdmin.full_name || 'System Admin'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ borderRadius: '14px' }}>
            ⬅ Main Portal
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary" style={{ borderRadius: '14px' }}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={handleLogout} className="btn btn-danger" style={{ borderRadius: '14px' }}>
            🔒 Logout
          </button>
        </div>
      </div>

      {/* VIBRANT ANALYTICS CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #38bdf8' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL STUDENTS</span>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', margin: '4px 0 0 0', color: 'var(--text-main)' }}>{stats.totalStudents || 0}</div>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #a855f7' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL FACULTY</span>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', margin: '4px 0 0 0', color: 'var(--text-main)' }}>{stats.totalTeachers || 0}</div>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #34d399' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TODAY PRESENT</span>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', margin: '4px 0 0 0', color: '#34d399' }}>{stats.todayPresent || 0}</div>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #f87171' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TODAY ABSENT</span>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', margin: '4px 0 0 0', color: '#f87171' }}>{stats.todayAbsent || 0}</div>
        </div>

      </div>

      {/* FORM SECTION 1: ADD FACULTY */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          👨‍🏫 Register Faculty Member
        </h3>
        <form onSubmit={handleAddTeacher} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr)) 140px', gap: '14px', alignItems: 'end' }}>
          <div>
            <label>Teacher ID</label>
            <input placeholder="e.g. T101" value={teacherForm.teacher_id} onChange={e => setTeacherForm({...teacherForm, teacher_id: e.target.value})} required />
          </div>
          <div>
            <label>Full Name</label>
            <input placeholder="e.g. Dr. Dupesh" value={teacherForm.full_name} onChange={e => setTeacherForm({...teacherForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label>Email Address</label>
            <input type="email" placeholder="faculty@college.edu" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} required />
          </div>
          <div>
            <label>Phone Number</label>
            <input placeholder="9876543210" maxLength="10" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} required />
          </div>
          <div>
            <label>Department / Branch</label>
            <input placeholder="MCA / CSE" value={teacherForm.branch} onChange={e => setTeacherForm({...teacherForm, branch: e.target.value, dept_code: e.target.value})} required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={teacherForm.password_hash} onChange={e => setTeacherForm({...teacherForm, password_hash: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
            Add Faculty
          </button>
        </form>
      </div>

      {/* FORM SECTION 2: ADD STUDENT */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎓 Register Student
        </h3>
        <form onSubmit={handleAddStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) 140px', gap: '14px', alignItems: 'end' }}>
          <div>
            <label>Roll Number</label>
            <input placeholder="e.g. 2585351122" value={studentForm.roll_no} onChange={e => setStudentForm({...studentForm, roll_no: e.target.value})} required />
          </div>
          <div>
            <label>Full Name</label>
            <input placeholder="e.g. Yamini" value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label>Department</label>
            <input placeholder="MCA / CSE" value={studentForm.dept_code} onChange={e => setStudentForm({...studentForm, dept_code: e.target.value})} required />
          </div>
          <div>
            <label>Parent Phone</label>
            <input placeholder="9876543210" maxLength="10" value={studentForm.parent_phone} onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
            Add Student
          </button>
        </form>
      </div>

      {/* FACULTY DIRECTORY TABLE */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800' }}>👨‍🏫 Registered Faculty Directory</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '14px 12px' }}>TEACHER ID</th>
                <th style={{ padding: '14px 12px' }}>FULL NAME</th>
                <th style={{ padding: '14px 12px' }}>EMAIL</th>
                <th style={{ padding: '14px 12px' }}>BRANCH</th>
                <th style={{ padding: '14px 12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {!teachers || teachers.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No faculty registered yet.</td></tr>
              ) : (
                teachers.map(t => (
                  <tr key={t.teacher_id || Math.random()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: '700' }}>{t.teacher_id || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>{t.full_name || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>{t.email || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>{t.dept_code || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <button onClick={() => setEditTeacher(t)} className="btn btn-secondary" style={{ marginRight: '8px', padding: '6px 12px', fontSize: '0.8rem' }}>✏️ Edit</button>
                      <button onClick={() => handleDeleteTeacher(t)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DIRECTORY TABLE */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: '800' }}>🎓 Registered Student Roster</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '14px 12px' }}>ROLL NO</th>
                <th style={{ padding: '14px 12px' }}>FULL NAME</th>
                <th style={{ padding: '14px 12px' }}>DEPARTMENT</th>
                <th style={{ padding: '14px 12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {!students || students.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No students registered yet.</td></tr>
              ) : (
                students.map(s => (
                  <tr key={s.roll_no || Math.random()} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: '700' }}>{s.roll_no || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>{s.full_name || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>{s.dept_code || '-'}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <button onClick={() => setEditStudent(s)} className="btn btn-secondary" style={{ marginRight: '8px', padding: '6px 12px', fontSize: '0.8rem' }}>✏️ Edit</button>
                      <button onClick={() => handleDeleteStudent(s)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT TEACHER MODAL */}
      {editTeacher && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>✏️ Edit Faculty Account</h3>
            <form onSubmit={handleUpdateTeacher}>
              <div style={{ marginBottom: '12px' }}>
                <label>Full Name</label>
                <input type="text" value={editTeacher.full_name || ''} onChange={e => setEditTeacher({...editTeacher, full_name: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label>Email Address</label>
                <input type="email" value={editTeacher.email || ''} onChange={e => setEditTeacher({...editTeacher, email: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label>Branch / Department</label>
                <input type="text" value={editTeacher.dept_code || ''} onChange={e => setEditTeacher({...editTeacher, dept_code: e.target.value})} required />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditTeacher(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editStudent && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>✏️ Edit Student Record</h3>
            <form onSubmit={handleUpdateStudent}>
              <div style={{ marginBottom: '12px' }}>
                <label>Full Name</label>
                <input type="text" value={editStudent.full_name || ''} onChange={e => setEditStudent({...editStudent, full_name: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label>Department</label>
                <input type="text" value={editStudent.dept_code || ''} onChange={e => setEditStudent({...editStudent, dept_code: e.target.value})} required />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditStudent(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANIMATED DELETION TOAST */}
      {toast && (
        <div className="toast-container">
          <div className="toast-box">{toast}</div>
        </div>
      )}

    </div>
  );
}