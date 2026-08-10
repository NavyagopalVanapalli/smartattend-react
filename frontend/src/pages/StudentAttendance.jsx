import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Student() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  useEffect(() => {
    // 1. One-time reset check
    const HAS_RESET = localStorage.getItem("reset_wrong_rollno_v1");
    if (!HAS_RESET) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("reset_wrong_rollno_v1", "true");
    }

    // 2. Load saved student profile
    const savedStudent = localStorage.getItem("student_profile");
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      fetchStudentStats(parsed.roll_no);
    }
  }, []);

  // 3. Auto-refresh student stats every 5 seconds
  useEffect(() => {
    if (studentInfo?.roll_no) {
      fetchStudentStats(studentInfo.roll_no);
      const interval = setInterval(() => {
        fetchStudentStats(studentInfo.roll_no);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [studentInfo]);

  const fetchStudentStats = async (rollNo) => {
    try {
      const res = await axios.get(`/api/student/stats?roll_no=${rollNo}`);
      setAttendanceStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!rollNoInput.trim()) return;

    try {
      const res = await axios.get(`/api/student/verify?roll_no=${rollNoInput.trim()}`);
      if (res.data.success) {
        const studentData = res.data.student;
        localStorage.setItem("student_profile", JSON.stringify(studentData));
        setStudentInfo(studentData);
        fetchStudentStats(studentData.roll_no);
      } else {
        alert("Roll Number not found in system.");
      }
    } catch (err) {
      alert("Error verifying Roll Number.");
    }
  };

  const handleClearProfile = () => {
    localStorage.removeItem("student_profile");
    setStudentInfo(null);
    setAttendanceStats(null);
  };

  // 4. QR LOCATION VERIFICATION & AUTOMATIC PRESENT CONVERSION
  const handleScanAndMarkAttendance = () => {
    if (!navigator.geolocation) {
      setScanMessage({ type: 'error', text: 'Geolocation is not supported on this device.' });
      return;
    }

    // Extract sessionId from URL params if student opened QR URL directly
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (!sessionId) {
      setScanMessage({ type: 'error', text: 'No active session found. Please scan the QR code displayed by your faculty.' });
      return;
    }

    setScanning(true);
    setScanMessage({ type: 'info', text: 'Verifying GPS Location...' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await axios.post('/api/qr/verify-student', {
            rollNo: studentInfo.roll_no,
            studentLat: position.coords.latitude,
            studentLng: position.coords.longitude,
            sessionId: sessionId
          });

          if (res.data.success) {
            setScanMessage({ type: 'success', text: '✅ Location Verified! Attendance marked as PRESENT and locked.' });
            fetchStudentStats(studentInfo.roll_no);
          }
        } catch (err) {
          const errorMsg = err.response?.data?.message || 'Verification failed. Make sure you are inside the classroom.';
          setScanMessage({ type: 'error', text: `❌ ${errorMsg}` });
        } finally {
          setScanning(false);
        }
      },
      (error) => {
        setScanning(false);
        setScanMessage({ type: 'error', text: '📍 Please enable GPS/Location permissions on your browser to mark attendance.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
      color: '#f8fafc',
      padding: '24px 16px',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        
        {/* BRANDING HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '1.2rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px', margin: 0, background: 'linear-gradient(to right, #ffffff, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SmartAttend</h2>
        </div>

        {!studentInfo ? (
          /* REGISTRATION CARD */
          <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(16px)', borderRadius: '24px', padding: '28px 24px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎓</div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>Connect Your Device</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px' }}>Enter your Roll Number once to initialize your mobile dashboard.</p>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#a855f7', textTransform: 'uppercase', tracking: '1px', marginBottom: '8px' }}>ROLL NUMBER</label>
                <input
                  type="text"
                  placeholder="e.g. 2585351122"
                  value={rollNoInput}
                  onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15, 23, 42, 0.6)', color: '#fff', fontSize: '1rem', fontWeight: '700', textAlign: 'center', outline: 'none' }}
                  required
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #9333ea)', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' }}>
                Save Profile & Continue →
              </button>
            </form>
          </div>
        ) : (
          /* MODERN STUDENT DASHBOARD */
          <div>
            
            {/* PROFILE CARD WITHOUT SWITCH BUTTON (PREVENTS PROXY LOGINS) */}
<div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px' }}>
  <div>
    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>LINKED DEVICE</span>
    <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: '700' }}>{studentInfo.full_name}</h3>
    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Roll: <strong style={{ color: '#fff' }}>{studentInfo.roll_no}</strong> • {studentInfo.dept_code}</span>
  </div>
</div>

            {/* PERCENTAGE METRICS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              
              {/* WEEKLY METRIC */}
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '20px', padding: '18px 14px', border: '1px solid rgba(99, 102, 241, 0.2)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase' }}>WEEKLY RATE</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', margin: '6px 0', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {attendanceStats ? `${attendanceStats.weeklyPercentage}%` : '...'}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  {attendanceStats ? `${attendanceStats.weeklyPresent}/${attendanceStats.weeklyTotal} Attended` : ''}
                </span>
              </div>

              {/* MONTHLY METRIC */}
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '20px', padding: '18px 14px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#34d399', textTransform: 'uppercase' }}>MONTHLY RATE</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', margin: '6px 0', background: 'linear-gradient(to right, #34d399, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {attendanceStats ? `${attendanceStats.monthlyPercentage}%` : '...'}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  {attendanceStats ? `${attendanceStats.monthlyPresent}/${attendanceStats.monthlyTotal} Attended` : ''}
                </span>
              </div>

            </div>

            {/* ATTENDANCE ACTION CARD */}
            <div style={{ background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '700' }}>Classroom Check-In</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 16px 0' }}>Verify GPS position against teacher classroom coordinates.</p>

              <button
                onClick={handleScanAndMarkAttendance}
                disabled={scanning}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  background: scanning ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: scanning ? 'not-allowed' : 'pointer',
                  boxShadow: scanning ? 'none' : '0 8px 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                {scanning ? '📡 Verifying GPS Location...' : '📍 Verify Location & Mark Present'}
              </button>

              {scanMessage && (
                <div style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  background: scanMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : scanMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  border: `1px solid ${scanMessage.type === 'success' ? '#10b981' : scanMessage.type === 'error' ? '#ef4444' : '#6366f1'}`,
                  color: scanMessage.type === 'success' ? '#34d399' : scanMessage.type === 'error' ? '#f87171' : '#a5b4fc'
                }}>
                  {scanMessage.text}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}