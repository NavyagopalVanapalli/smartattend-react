import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// HELPER: Get exact local YYYY-MM-DD date string (Prevents UTC timezone offsets)
const getLocalTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const activeTeacher = JSON.parse(sessionStorage.getItem("activeTeacher") || "{}");

  const todayStr = getLocalTodayString();

  // Filters State - Defaults to local today
  const [filters, setFilters] = useState({
    dept: activeTeacher.dept_code || 'MCA',
    year: '1st Year',
    sec: 'Sec A',
    hour: 'Hour 1 (09:00 AM)',
    date: todayStr
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ roll_no: '', full_name: '', parent_phone: '' });

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrData, setQrData] = useState('');

  // 1. Initial Load & Filter Change Effect
  useEffect(() => {
    if (!activeTeacher.teacher_id) {
      navigate('/');
      return;
    }
    setAttendance({});
    fetchStudentsAndAttendance();
  }, [filters.dept, filters.year, filters.sec, filters.hour, filters.date]);

  // 2. Real-time Live Polling Every 3 Seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveAttendanceOnly();
    }, 3000);
    return () => clearInterval(interval);
  }, [filters.dept, filters.hour, filters.date]);

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      const resStudents = await axios.get(`/api/students?dept=${filters.dept}&year=${filters.year}&section=${filters.sec}`);
      const studentData = resStudents.data || [];

      const resSaved = await axios.get(`/api/attendance/records?dept=${filters.dept}&hour=${filters.hour}&date=${filters.date}`);
      const savedRecords = resSaved.data || [];

      const savedMap = {};
      savedRecords.forEach(rec => {
        savedMap[rec.roll_no] = rec;
      });

      setStudents(studentData);

      const freshAttendance = {};
      studentData.forEach(s => {
        if (savedMap[s.roll_no]) {
          const isPresent = savedMap[s.roll_no].status === "Present";
          freshAttendance[s.roll_no] = {
            checked: isPresent,
            smsStatus: savedMap[s.roll_no].sms_status || "Not Sent",
            locked: isPresent
          };
        } else {
          freshAttendance[s.roll_no] = { checked: false, smsStatus: "Not Sent", locked: false };
        }
      });

      setAttendance(freshAttendance);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveAttendanceOnly = async () => {
    try {
      const resLive = await axios.get(
        `/api/attendance/live?dept=${filters.dept}&hour=${encodeURIComponent(filters.hour)}&date=${filters.date}&teacherId=${activeTeacher.teacher_id}`
      );
      const liveRecords = resLive.data || [];

      if (liveRecords.length > 0) {
        setAttendance(prev => {
          let hasChanges = false;
          const nextState = { ...prev };

          liveRecords.forEach(r => {
            const roll = r.roll_no;
            if (!nextState[roll] || !nextState[roll].checked) {
              nextState[roll] = {
                checked: true,
                smsStatus: nextState[roll]?.smsStatus || "Not Sent",
                locked: true
              };
              hasChanges = true;
            }
          });

          return hasChanges ? nextState : prev;
        });
      }
    } catch (err) {
      // Silent catch for background polling
    }
  };

  const handleGenerateQr = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await axios.post('/api/qr/generate-location', {
            dept: filters.dept,
            year: filters.year,
            section: filters.sec,
            hour: filters.hour,
            date: filters.date,
            teacherLat: position.coords.latitude,
            teacherLng: position.coords.longitude,
            teacherId: activeTeacher.teacher_id || 'FAC101'
          });

          if (res.data.success) {
            const baseUrl = window.location.origin.includes('localhost')
              ? 'http://192.168.0.100:5173'
              : window.location.origin;

            const studentAccessUrl = `${baseUrl}/student?sessionId=${res.data.sessionId}`;
            setQrData(studentAccessUrl);
            setIsQrOpen(true);
          }
        } catch (err) {
          alert("Failed to generate classroom QR code.");
        }
      },
      () => alert("Please allow GPS location permission to generate classroom QR code."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.roll_no || !studentForm.full_name) {
      alert("Please enter Roll Number and Full Name.");
      return;
    }

    try {
      await axios.post('/api/admin/students', {
        ...studentForm,
        dept_code: filters.dept,
        year_level: filters.year,
        section: filters.sec
      });
      alert("✅ Student registered successfully!");
      setIsAddStudentOpen(false);
      setStudentForm({ roll_no: '', full_name: '', parent_phone: '' });
      fetchStudentsAndAttendance();
    } catch (err) {
      alert("Error adding student.");
    }
  };

  const handleToggleAttendance = (rollNo) => {
    setAttendance(prev => {
      const current = prev[rollNo] || { checked: false, smsStatus: "Not Sent", locked: false };
      
      if (current.locked) {
        alert("🔒 Attendance is marked as Present and cannot be reverted to Absent.");
        return prev;
      }

      const nextChecked = !current.checked;
      return {
        ...prev,
        [rollNo]: {
          ...current,
          checked: nextChecked,
          locked: nextChecked ? true : current.locked
        }
      };
    });
  };

  const handleSaveAttendance = async () => {
    const records = students.map(s => ({
      roll_no: s.roll_no,
      status: attendance[s.roll_no]?.checked ? 'Present' : 'Absent',
      sms_status: attendance[s.roll_no]?.smsStatus || 'Not Sent'
    }));

    try {
      const res = await axios.post('/api/attendance/submit', {
        date: filters.date,
        hour: filters.hour,
        teacherId: activeTeacher.teacher_id,
        dept: filters.dept,
        records
      });

      if (res.data.success) {
        alert("✅ Attendance saved permanently!");
        fetchStudentsAndAttendance();
      }
    } catch (err) {
      alert("Failed to save attendance.");
    }
  };

  const handleSendWhatsApp = (student) => {
    let cleanPhone = student.parent_phone ? student.parent_phone.replace(/\D/g, "") : "";
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const msg = `Dear Parent, your child ${student.full_name} (${student.roll_no}) was marked ABSENT for ${filters.dept} (${filters.hour}) on ${filters.date}. - SmartAttend System`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDeleteStudent = async (rollNo) => {
    if (!confirm(`Are you sure you want to delete student ${rollNo}?`)) return;

    try {
      const res = await axios.delete(`/api/students/delete?roll_no=${rollNo}&dept_code=${filters.dept}`);
      if (res.data.success) {
        setStudents(prev => prev.filter(s => s.roll_no !== rollNo));
        setAttendance(prev => {
          const next = { ...prev };
          delete next[rollNo];
          return next;
        });
      }
    } catch (err) {
      alert("Error deleting student.");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const res = await axios.post('/api/change-password', {
        teacherId: activeTeacher.teacher_id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.data.success) {
        alert("✅ Password updated successfully!");
        setIsPasswordModalOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error updating password.");
    }
  };

  const filteredStudents = students.filter(s =>
    s.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentStudents = students.filter(s => attendance[s.roll_no]?.checked);
  const absentStudents = students.filter(s => !attendance[s.roll_no]?.checked);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '20px 15px' }}>
      
      {/* 1. TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/Srivishnu_Logo.jpg" alt="Vishnu Logo" style={{ height: '42px', width: '42px', borderRadius: '8px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>SmartAttend</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/admin-login')} className="btn btn-secondary" style={{ borderRadius: '20px', fontSize: '0.85rem' }}>
            🛡️ Admin Panel
          </button>
          <button onClick={() => setIsPasswordModalOpen(true)} className="btn btn-secondary" style={{ borderRadius: '20px', fontSize: '0.85rem' }}>
            🔑 Change Password
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary" style={{ borderRadius: '20px', fontSize: '0.85rem' }}>
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button onClick={() => { sessionStorage.clear(); navigate('/'); }} className="btn btn-danger" style={{ borderRadius: '20px', fontSize: '0.85rem' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* 2. FACULTY DETAILS BANNER */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: '20px', background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary)' }}>
          👤 Faculty: {activeTeacher.full_name || 'Dr. Dupesh'} | ID: {activeTeacher.teacher_id || 'FAC101'}
        </span>
      </div>

      {/* 3. FILTERS CARD */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>DEPARTMENT</label>
            <select value={filters.dept} onChange={e => setFilters({...filters, dept: e.target.value})} style={{ width: '100%', padding: '10px' }}>
              <option value="MCA">MCA</option>
              <option value="MBA">MBA</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>YEAR</label>
            <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} style={{ width: '100%', padding: '10px' }}>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>SECTION</label>
            <select value={filters.sec} onChange={e => setFilters({...filters, sec: e.target.value})} style={{ width: '100%', padding: '10px' }}>
              <option value="Sec A">Sec A</option>
              <option value="Sec B">Sec B</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>CLASS HOUR</label>
            <select value={filters.hour} onChange={e => setFilters({...filters, hour: e.target.value})} style={{ width: '100%', padding: '10px' }}>
              <option value="Hour 1 (09:00 AM)">Hour 1 (09:00 AM)</option>
              <option value="Hour 2 (10:00 AM)">Hour 2 (10:00 AM)</option>
              <option value="Hour 3 (11:15 AM)">Hour 3 (11:15 AM)</option>
              <option value="Hour 4 (12:15 PM)">Hour 4 (12:15 PM)</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', margin: 0 }}>DATE</label>
              <button 
                type="button"
                onClick={() => setFilters({ ...filters, date: getLocalTodayString() })}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
              >
                📅 Today
              </button>
            </div>
            <input 
              type="date" 
              max={todayStr} 
              value={filters.date} 
              onChange={e => setFilters({ ...filters, date: e.target.value })} 
              style={{ width: '100%', padding: '10px' }} 
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => setIsAddStudentOpen(true)} className="btn btn-secondary">
            ➕ Add Student
          </button>
          <button onClick={handleGenerateQr} className="btn btn-secondary">
            📱 Generate Class QR
          </button>
          <button onClick={handleSaveAttendance} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            💾 Save Attendance
          </button>
        </div>
      </div>

      {/* 4. CLASS REGISTER TABLE */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Class Attendance Register</h3>
          <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: '600', padding: '6px 14px', borderRadius: '20px' }}>
            {filters.dept} - {filters.year} ({filters.sec}) | {filters.hour}
          </span>
        </div>

        {/* SEARCH BAR */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="🔍 Search Student by Name or Roll Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 18px' }}
          />
        </div>

        {/* TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px' }}>ROLL NO</th>
                <th style={{ padding: '14px' }}>STUDENT NAME</th>
                <th style={{ padding: '14px' }}>PARENT PHONE</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>ATTENDANCE TOGGLE</th>
                <th style={{ padding: '14px' }}>SMS ALERT STATUS</th>
                <th style={{ padding: '14px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Loading Roster...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No students found.</td></tr>
              ) : (
                filteredStudents.map(s => {
                  const isChecked = attendance[s.roll_no]?.checked || false;
                  const isLocked = attendance[s.roll_no]?.locked || false;

                  return (
                    <tr key={s.roll_no} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '14px', fontWeight: '700' }}>{s.roll_no}</td>
                      <td style={{ padding: '14px' }}>{s.full_name}</td>
                      <td style={{ padding: '14px' }}>{s.parent_phone}</td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isLocked}
                              onChange={() => handleToggleAttendance(s.roll_no)}
                            />
                            <span className="slider"></span>
                          </label>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isChecked ? 'var(--success)' : 'var(--danger)' }}>
                            {isChecked ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {attendance[s.roll_no]?.smsStatus || 'Not Sent'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleSendWhatsApp(s)} 
                          className="btn" 
                          style={{ padding: '5px 12px', fontSize: '0.8rem', background: 'rgba(37, 211, 102, 0.15)', color: '#25D366', borderColor: '#25D366' }}
                        >
                          💬 WhatsApp
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(s.roll_no)} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#94a3b8' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SUMMARY ANALYTICS SECTION */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '24px' }}>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>TOTAL STUDENTS</h4>
            <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#4f46e5' }}>{students.length}</span>
          </div>

          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', borderLeft: '4px solid #10b981', borderTop: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>PRESENT</h4>
            <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#10b981' }}>{presentStudents.length}</span>
          </div>

          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', borderLeft: '4px solid #ef4444', borderTop: '1px solid var(--glass-border)', borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <h4 style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>ABSENT</h4>
            <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ef4444' }}>{absentStudents.length}</span>
          </div>
        </div>

        {/* SIDE-BY-SIDE LISTS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', color: '#10b981' }}>Present List ({presentStudents.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {presentStudents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No students marked present yet.</p>
              ) : (
                presentStudents.map(s => (
                  <div key={s.roll_no} style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.88rem', fontWeight: '600' }}>
                    {s.roll_no} - {s.full_name}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', color: '#ef4444' }}>Absent List ({absentStudents.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {absentStudents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No absent students in this class.</p>
              ) : (
                absentStudents.map(s => (
                  <div key={s.roll_no} style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.88rem', fontWeight: '600' }}>
                    {s.roll_no} - {s.full_name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {isAddStudentOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>🎓 Register New Student</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
              Adding to: <strong>{filters.dept} ({filters.year} - {filters.sec})</strong>
            </p>
            <form onSubmit={handleAddStudent}>
              <div className="input-group">
                <label>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. 21CS01"
                  value={studentForm.roll_no}
                  onChange={e => setStudentForm({...studentForm, roll_no: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={studentForm.full_name}
                  onChange={e => setStudentForm({...studentForm, full_name: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Parent Phone (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength="10"
                  value={studentForm.parent_phone}
                  onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddStudentOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQrOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <h3>📱 Classroom Live QR Code</h3>
            <div style={{ background: '#ffffff', padding: '15px', borderRadius: '16px', display: 'inline-block', margin: '15px 0' }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`} 
                alt="Class QR Code" 
                style={{ width: '200px', height: '200px' }} 
              />
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button onClick={() => setIsQrOpen(false)} className="btn btn-primary">
                Close QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>🔑 Change Faculty Password</h3>
            <form onSubmit={handleChangePassword} style={{ marginTop: '15px' }}>
              <div className="input-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}