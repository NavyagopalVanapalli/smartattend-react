import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, todayPresent: 0, todayAbsent: 0 });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState(null);

  // Prevents selecting future dates
  const todayStr = new Date().toISOString().split('T')[0];

  // Edit Modal States
  const [editTeacher, setEditTeacher] = useState(null);
  const [editStudent, setEditStudent] = useState(null);

  const [teacherForm, setTeacherForm] = useState({ 
    teacher_id: '', full_name: '', email: '', phone: '', password_hash: '', dept_code: '', branch: '' 
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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAdminData = async () => {
    try {
      const resStats = await axios.get('/api/admin/stats');
      const resTeachers = await axios.get('/api/admin/teachers-list');
      const resStudents = await axios.get('/api/admin/students-list');

      setStats(resStats.data);
      setTeachers(resTeachers.data || []);
      setStudents(resStudents.data || []);
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/teachers', teacherForm);
      showToast(`✅ Faculty ${teacherForm.full_name} added successfully!`);
      setTeacherForm({ teacher_id: '', full_name: '', email: '', phone: '', password_hash: '', dept_code: '', branch: '' });
      fetchAdminData();
    } catch (err) {
      alert("Error adding faculty");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/students', studentForm);
      showToast(`✅ Student ${studentForm.full_name} added successfully!`);
      setStudentForm({ roll_no: '', full_name: '', dept_code: '', parent_phone: '' });
      fetchAdminData();
    } catch (err) {
      alert("Error adding student");
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    if (!confirm(`Delete Faculty ID: ${teacher.teacher_id}?`)) return;
    try {
      await axios.delete(`/api/admin/teachers/delete?teacher_id=${teacher.teacher_id}`);
      setTeachers(prev => prev.filter(t => t.teacher_id !== teacher.teacher_id));
      showToast(`🗑️ Successfully deleted Faculty: ${teacher.full_name}`);
    } catch (err) {
      alert("Error deleting faculty");
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!confirm(`Delete student ${student.roll_no}?`)) return;
    try {
      await axios.delete(`/api/students/delete?roll_no=${student.roll_no}&dept_code=${student.dept_code}`);
      setStudents(prev => prev.filter(s => s.roll_no !== student.roll_no));
      showToast(`🗑️ Successfully deleted Student: ${student.full_name} (${student.roll_no})`);
    } catch (err) {
      alert("Error deleting student");
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/admin/teachers/update', editTeacher);
      fetchAdminData();
      setEditTeacher(null);
      showToast(`✅ Successfully updated ${editTeacher.full_name}`);
    } catch (err) {
      alert("Failed to update teacher.");
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/admin/students/update', editStudent);
      fetchAdminData();
      setEditStudent(null);
      showToast(`✅ Successfully updated ${editStudent.full_name}`);
    } catch (err) {
      alert("Failed to update student.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '25px 5%' }}>
      
      {/* TOP NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          ⬅ Back to Login
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary">
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button onClick={() => { sessionStorage.clear(); navigate('/admin-login'); }} className="btn btn-danger">
            🔒 Logout
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '20px' }}>⚡ System Admin Panel</h1>

      {/* STATS SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL STUDENTS</span>
          <h2 style={{ fontSize: '2.2rem', color: '#38bdf8', marginTop: '4px' }}>{stats.totalStudents}</h2>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL FACULTY</span>
          <h2 style={{ fontSize: '2.2rem', color: '#a855f7', marginTop: '4px' }}>{stats.totalTeachers}</h2>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TODAY PRESENT</span>
          <h2 style={{ fontSize: '2.2rem', color: '#34d399', marginTop: '4px' }}>{stats.todayPresent}</h2>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TODAY ABSENT</span>
          <h2 style={{ fontSize: '2.2rem', color: '#f87171', marginTop: '4px' }}>{stats.todayAbsent}</h2>
        </div>
      </div>

      {/* ADD FACULTY FORM */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>👨‍🏫 Add New Faculty</h3>
        <form onSubmit={handleAddTeacher} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) 130px', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Teacher ID</label>
            <input placeholder="T101" value={teacherForm.teacher_id} onChange={e => setTeacherForm({...teacherForm, teacher_id: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Full Name</label>
            <input placeholder="Dr. Smith" value={teacherForm.full_name} onChange={e => setTeacherForm({...teacherForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Email</label>
            <input type="email" placeholder="smith@college.edu" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Phone</label>
            <input placeholder="9876543210" maxLength="10" value={teacherForm.phone} onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Branch</label>
            <input placeholder="CSE / MCA" value={teacherForm.branch} onChange={e => setTeacherForm({...teacherForm, branch: e.target.value, dept_code: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Password</label>
            <input type="password" placeholder="••••••••" value={teacherForm.password_hash} onChange={e => setTeacherForm({...teacherForm, password_hash: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary">Add Faculty</button>
        </form>
      </div>

      {/* ADD STUDENT FORM (RESTORED) */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>🎓 Add New Student</h3>
        <form onSubmit={handleAddStudent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) 130px', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Roll Number</label>
            <input placeholder="2585351122" value={studentForm.roll_no} onChange={e => setStudentForm({...studentForm, roll_no: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Full Name</label>
            <input placeholder="John Doe" value={studentForm.full_name} onChange={e => setStudentForm({...studentForm, full_name: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Department</label>
            <input placeholder="MCA / CSE" value={studentForm.dept_code} onChange={e => setStudentForm({...studentForm, dept_code: e.target.value})} required />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Parent Phone</label>
            <input placeholder="9876543210" maxLength="10" value={studentForm.parent_phone} onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary">Add Student</button>
        </form>
      </div>

      {/* FACULTY DIRECTORY */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>👨‍🏫 Registered Faculty Directory</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>FULL NAME</th>
                <th style={{ padding: '12px' }}>EMAIL</th>
                <th style={{ padding: '12px' }}>BRANCH</th>
                <th style={{ padding: '12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.teacher_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px' }}><b>{t.teacher_id}</b></td>
                  <td style={{ padding: '12px' }}>{t.full_name}</td>
                  <td style={{ padding: '12px' }}>{t.email}</td>
                  <td style={{ padding: '12px' }}>{t.dept_code}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => setEditTeacher(t)} className="btn btn-secondary" style={{ marginRight: '8px', padding: '4px 10px' }}>✏️ Edit</button>
                    <button onClick={() => handleDeleteTeacher(t)} className="btn btn-danger" style={{ padding: '4px 10px' }}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DIRECTORY */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>🎓 Registered Student Directory</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '12px' }}>ROLL NO</th>
                <th style={{ padding: '12px' }}>FULL NAME</th>
                <th style={{ padding: '12px' }}>DEPT</th>
                <th style={{ padding: '12px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.roll_no} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '12px' }}><b>{s.roll_no}</b></td>
                  <td style={{ padding: '12px' }}>{s.full_name}</td>
                  <td style={{ padding: '12px' }}>{s.dept_code}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => setEditStudent(s)} className="btn btn-secondary" style={{ marginRight: '8px', padding: '4px 10px' }}>✏️ Edit</button>
                    <button onClick={() => handleDeleteStudent(s)} className="btn btn-danger" style={{ padding: '4px 10px' }}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT TEACHER MODAL */}
      {editTeacher && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>✏️ Edit Faculty</h3>
            <form onSubmit={handleUpdateTeacher}>
              <label style={{ display: 'block', margin: '10px 0 4px 0', fontSize: '0.8rem' }}>Full Name</label>
              <input type="text" value={editTeacher.full_name} onChange={e => setEditTeacher({...editTeacher, full_name: e.target.value})} required style={{ width: '100%' }} />
              
              <label style={{ display: 'block', margin: '10px 0 4px 0', fontSize: '0.8rem' }}>Email</label>
              <input type="email" value={editTeacher.email} onChange={e => setEditTeacher({...editTeacher, email: e.target.value})} required style={{ width: '100%' }} />
              
              <label style={{ display: 'block', margin: '10px 0 4px 0', fontSize: '0.8rem' }}>Branch / Dept</label>
              <input type="text" value={editTeacher.dept_code} onChange={e => setEditTeacher({...editTeacher, dept_code: e.target.value})} required style={{ width: '100%', marginBottom: '16px' }} />
              
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" onClick={() => setEditTeacher(null)} className="btn btn-secondary" style={{ marginLeft: '8px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editStudent && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>✏️ Edit Student</h3>
            <form onSubmit={handleUpdateStudent}>
              <label style={{ display: 'block', margin: '10px 0 4px 0', fontSize: '0.8rem' }}>Full Name</label>
              <input type="text" value={editStudent.full_name} onChange={e => setEditStudent({...editStudent, full_name: e.target.value})} required style={{ width: '100%' }} />
              
              <label style={{ display: 'block', margin: '10px 0 4px 0', fontSize: '0.8rem' }}>Department</label>
              <input type="text" value={editStudent.dept_code} onChange={e => setEditStudent({...editStudent, dept_code: e.target.value})} required style={{ width: '100%', marginBottom: '16px' }} />
              
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" onClick={() => setEditStudent(null)} className="btn btn-secondary" style={{ marginLeft: '8px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST ANIMATION */}
      {toast && (
        <div className="toast-container">
          <div className="toast-box">{toast}</div>
        </div>
      )}

    </div>
  );
}