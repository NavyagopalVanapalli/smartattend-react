import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const HOLIDAYS = {
  '2026-01-01': "New Year's Day",
  '2026-01-14': 'Makara Sankranti / Pongal',
  '2026-01-15': 'Kanuma',
  '2026-01-26': 'Republic Day',
  '2026-02-15': 'Maha Shivratri',
  '2026-03-04': 'Holi',
  '2026-03-19': 'Ugadi / Gudi Padwa',
  '2026-03-21': 'Eid-ul-Fitr (Ramzan)',
  '2026-03-26': 'Sri Rama Navami',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. B.R. Ambedkar Jayanti',
  '2026-05-01': 'May Day / Buddha Purnima',
  '2026-05-27': 'Bakrid (Eid-ul-Adha)',
  '2026-06-26': 'Muharram',
  '2026-08-15': 'Independence Day',
  '2026-08-26': 'Milad-un-Nabi',
  '2026-09-04': 'Sri Krishna Janmashtami',
  '2026-09-14': 'Vinayaka Chavithi',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-10-20': 'Dussehra (Vijayadasami)',
  '2026-11-08': 'Diwali (Deepavali)',
  '2026-12-25': 'Christmas Day'
};

export default function StudentAttendance({ darkMode, setDarkMode }) {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [detailedStats, setDetailedStats] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  // Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    const savedStudent = localStorage.getItem("student_profile");
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      fetchDetailedStats(parsed.roll_no);
    }
  }, []);

  useEffect(() => {
    if (isCameraOpen && !scannerRef.current) {
      setCameraPermissionError(null);
      if (!window.Html5QrcodeScanner) {
        setCameraPermissionError("Scanner library is initializing, please try again in a moment.");
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(() => {
          const scanner = new window.Html5QrcodeScanner(
            "qr-reader-container",
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
            false
          );
          scanner.render(onScanSuccess, onScanFailure);
          scannerRef.current = scanner;
        })
        .catch(() => {
          setCameraPermissionError("Camera permission denied. Allow camera access in browser settings.");
        });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isCameraOpen]);

  const fetchDetailedStats = async (rollNo) => {
    try {
      const res = await axios.get(`/api/student/detailed-stats?roll_no=${rollNo}`);
      if (res.data && res.data.success) {
        setDetailedStats(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!rollNoInput.trim()) return;

    try {
      const res = await axios.get(`/api/student/verify?roll_no=${rollNoInput.trim()}`);
      if (res.data && res.data.success) {
        const studentData = res.data.student;
        localStorage.setItem("student_profile", JSON.stringify(studentData));
        setStudentInfo(studentData);
        fetchDetailedStats(studentData.roll_no);
      }
    } catch (err) {
      alert("Roll Number not registered in system. Contact faculty.");
    }
  };

  const onScanSuccess = (decodedText) => {
    let sessionId = null;
    try {
      if (decodedText.includes("sessionId=")) {
        const url = new URL(decodedText);
        sessionId = url.searchParams.get("sessionId");
      } else {
        sessionId = decodedText.trim();
      }
    } catch {
      sessionId = decodedText.trim();
    }

    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setIsCameraOpen(false);

    if (sessionId) {
      verifyLocationAndMarkAttendance(sessionId);
    }
  };

  const onScanFailure = () => {};

  const verifyLocationAndMarkAttendance = (sessionId) => {
    setScanning(true);
    setScanMessage({ type: 'info', text: '📡 Verifying classroom GPS...' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await axios.post('/api/qr/verify-student', {
            rollNo: studentInfo.roll_no,
            studentLat: position.coords.latitude,
            studentLng: position.coords.longitude,
            sessionId
          });

          if (res.data && res.data.success) {
            setScanMessage({ type: 'success', text: `✅ Attendance Marked PRESENT!` });
            fetchDetailedStats(studentInfo.roll_no);
          }
        } catch (err) {
          setScanMessage({ type: 'error', text: `❌ ${err.response?.data?.message || 'Verification failed.'}` });
        } finally {
          setScanning(false);
        }
      },
      () => {
        setScanning(false);
        setScanMessage({ type: 'error', text: '📍 Please enable GPS permission.' });
      },
      { enableHighAccuracy: true }
    );
  };

  // Calendar Calculations
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const recordsByDate = {};
  if (detailedStats?.recentHistory) {
    detailedStats.recentHistory.forEach(r => {
      if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
      recordsByDate[r.date].push(r);
    });
  }

  let monthPresent = 0;
  let monthAbsent = 0;
  let monthHolidays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();
    const isHoliday = dayOfWeek === 0 || HOLIDAYS[dStr];

    if (isHoliday) {
      monthHolidays++;
    } else if (recordsByDate[dStr]) {
      if (recordsByDate[dStr].some(r => r.status === 'Present')) monthPresent++;
      else monthAbsent++;
    }
  }

  const percentage = detailedStats ? detailedStats.attendancePercentage : 0;
  const isSafe = percentage >= 75;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>⚡ SmartAttend</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Student Attendance & Portfolio</span>
        </div>
        {setDarkMode && (
          <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        )}
      </div>

      {!studentInfo ? (
        <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
          <h3>Student Device Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Enter your Roll Number to access your portfolio & attendance.</p>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="e.g. 2585351122"
              value={rollNoInput}
              onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', margin: '14px 0', textAlign: 'center', fontWeight: '700' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>Connect Account →</button>
          </form>
        </div>
      ) : (
        <div>
          {/* PROFILE CARD WITH CLICKABLE NAME */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase' }}>STUDENT PROFILE</span>
              {/* Feature 1: Click name to view complete portfolio details */}
              <h3 
                onClick={() => setShowProfileModal(true)} 
                style={{ margin: '2px 0', fontSize: '1.15rem', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                title="Click to view portfolio & academic details"
              >
                {studentInfo.full_name} ℹ️
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Roll: <strong>{studentInfo.roll_no}</strong> • {studentInfo.dept_code}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: '800',
                background: isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isSafe ? '#10b981' : '#ef4444'
              }}>
                {percentage}%
              </div>
            </div>
          </div>

          {/* SCANNER ACTION */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <button onClick={() => setIsCameraOpen(true)} disabled={scanning} className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: '700' }}>
              {scanning ? '📡 Verifying...' : '📷 Scan Class QR'}
            </button>
            {scanMessage && (
              <p style={{ fontSize: '0.82rem', marginTop: '10px', color: scanMessage.type === 'success' ? '#10b981' : '#ef4444' }}>
                {scanMessage.text}
              </p>
            )}
          </div>

          {/* REAL ATTENDANCE CALENDAR (Feature 3) */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <button onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))} className="btn btn-secondary" style={{ padding: '4px 10px' }}>◀</button>
              <h4 style={{ margin: 0, fontWeight: '800' }}>{monthNames[month]} {year}</h4>
              <button onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))} className="btn btn-secondary" style={{ padding: '4px 10px' }}>▶</button>
            </div>

            {/* MONTHLY SUMMARY METRICS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', padding: '10px 0', marginBottom: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
              <div><span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: '700' }}>PRESENT</span><div style={{ fontWeight: '800', color: '#10b981', fontSize: '1.2rem' }}>{monthPresent}</div></div>
              <div><span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: '700' }}>ABSENT</span><div style={{ fontWeight: '800', color: '#ef4444', fontSize: '1.2rem' }}>{monthAbsent}</div></div>
              <div><span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700' }}>HOLIDAYS</span><div style={{ fontWeight: '800', color: '#38bdf8', fontSize: '1.2rem' }}>{monthHolidays}</div></div>
            </div>

            {/* WEEKDAY HEADERS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <div key={d} style={{ color: i === 0 ? '#38bdf8' : 'inherit' }}>{d}</div>
              ))}
            </div>

            {/* GRID DAYS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
              {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} style={{ height: '36px' }} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayOfWeek = new Date(year, month, dayNum).getDay();
                const holidayName = HOLIDAYS[dStr] || (dayOfWeek === 0 ? 'Sunday' : null);

                const dayRecords = recordsByDate[dStr];
                const isPresent = dayRecords?.some(r => r.status === 'Present');
                const isAbsent = dayRecords && !isPresent;

                let bg = 'var(--card-bg)';
                let color = 'var(--text-main)';
                let border = 'var(--glass-border)';

                if (holidayName) {
                  bg = 'rgba(56, 189, 248, 0.18)';
                  color = '#38bdf8';
                  border = '#38bdf8';
                } else if (isPresent) {
                  bg = 'rgba(16, 185, 129, 0.22)';
                  color = '#10b981';
                  border = '#10b981';
                } else if (isAbsent) {
                  bg = 'rgba(239, 68, 68, 0.22)';
                  color = '#ef4444';
                  border = '#ef4444';
                }

                return (
                  <div
                    key={dStr}
                    onClick={() => setSelectedDayModal({ date: dStr, holiday: holidayName, records: dayRecords || [] })}
                    style={{
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      background: bg,
                      color,
                      border: `1px solid ${border}`,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>
            
            {/* LEGEND */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '14px', fontSize: '0.75rem', fontWeight: '700' }}>
              <span style={{ color: '#10b981' }}>🟢 Present</span>
              <span style={{ color: '#ef4444' }}>🔴 Absent</span>
              <span style={{ color: '#38bdf8' }}>🔵 Holiday</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: STUDENT FULL DETAILS POPUP (Feature 1) */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left' }}>
            <h3 style={{ margin: '0 0 4px 0' }}>🎓 {studentInfo.full_name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
              Roll: {studentInfo.roll_no} | {studentInfo.dept_code} ({studentInfo.year_level || '1st Year'})
            </p>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>📅 Academic Period:</strong>
              <div style={{ fontSize: '0.88rem' }}>{studentInfo.academic_period || '2024 - 2026'}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>📊 Current Attendance:</strong>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: isSafe ? '#10b981' : '#ef4444' }}>
                {percentage}% ({detailedStats?.totalPresent || 0} Present / {detailedStats?.totalWorkingDays || 0} Days)
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>💻 Programming Languages:</strong>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {(studentInfo.programming_languages && studentInfo.programming_languages.length > 0)
                  ? studentInfo.programming_languages.map((l, i) => (
                      <span key={i} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600' }}>{l}</span>
                    ))
                  : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Python, JavaScript, React.js, C++</span>}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>🚀 Projects Built:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.82rem' }}>
                {(studentInfo.projects && studentInfo.projects.length > 0)
                  ? studentInfo.projects.map((p, i) => <li key={i}>{p}</li>)
                  : (
                    <>
                      <li>Smart Attendance System with GPS Geofencing</li>
                      <li>E-Commerce Cart Management with React</li>
                    </>
                  )}
              </ul>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>🏆 Certifications Received:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '0.82rem' }}>
                {(studentInfo.certificates && studentInfo.certificates.length > 0)
                  ? studentInfo.certificates.map((c, i) => <li key={i}>{c}</li>)
                  : (
                    <>
                      <li>Full-Stack Web Development Bootcamp Certificate</li>
                      <li>College Technical Fest - 1st Prize Web Designing</li>
                    </>
                  )}
              </ul>
            </div>

            <button onClick={() => setShowProfileModal(false)} className="btn btn-primary" style={{ width: '100%' }}>Close Profile</button>
          </div>
        </div>
      )}

      {/* MODAL 2: DAY DETAILS */}
      {selectedDayModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '340px' }}>
            <h3>📅 {selectedDayModal.date}</h3>
            {selectedDayModal.holiday && (
              <div style={{ margin: '10px 0', padding: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '8px', fontWeight: '700' }}>
                🎉 {selectedDayModal.holiday}
              </div>
            )}
            {selectedDayModal.records.length > 0 && selectedDayModal.records.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span>{r.hour}</span>
                <strong style={{ color: r.status === 'Present' ? '#10b981' : '#ef4444' }}>{r.status}</strong>
              </div>
            ))}
            <button onClick={() => setSelectedDayModal(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>Close</button>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {isCameraOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3>📷 Classroom QR Scanner</h3>
            {cameraPermissionError ? (
              <div style={{ color: '#ef4444', padding: '10px' }}>{cameraPermissionError}</div>
            ) : (
              <div id="qr-reader-container" style={{ width: '100%', borderRadius: '12px' }} />
            )}
            <button onClick={() => setIsCameraOpen(false)} className="btn btn-secondary" style={{ width: '100%', marginTop: '12px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}