import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Student() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [detailedStats, setDetailedStats] = useState(null);
  const [selectedMonthModal, setSelectedMonthModal] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  useEffect(() => {
    const savedStudent = localStorage.getItem("student_profile");
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      fetchDetailedStats(parsed.roll_no);
    }
  }, []);

  const fetchDetailedStats = async (rollNo) => {
    try {
      const res = await axios.get(`/api/student/detailed-stats?roll_no=${rollNo}`);
      if (res.data.success) {
        setDetailedStats(res.data);
      }
    } catch (err) {
      console.error("Error fetching detailed stats:", err);
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
        fetchDetailedStats(studentData.roll_no);
      }
    } catch (err) {
      alert("Roll Number not found in system.");
    }
  };

  const handleScanAndMarkAttendance = () => {
    if (!navigator.geolocation) {
      setScanMessage({ type: 'error', text: 'Geolocation is not supported on this device.' });
      return;
    }

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
            fetchDetailedStats(studentInfo.roll_no);
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
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
      
      {!studentInfo ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <h2>🎓 Student Registration</h2>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Enter Roll Number"
              value={rollNoInput}
              onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Connect Account</button>
          </form>
        </div>
      ) : (
        <div>
          {/* PROFILE CARD */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase' }}>LINKED DEVICE</span>
            <h3 style={{ margin: '2px 0 0 0' }}>{studentInfo.full_name}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Roll: {studentInfo.roll_no} | {studentInfo.dept_code}</span>
          </div>

          {/* OVERALL SUMMARY STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>WORKING DAYS</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#6366f1' }}>{detailedStats ? detailedStats.totalWorkingDays : 0}</h3>
            </div>
            <div className="card" style={{ padding: '12px', textAlign: 'center', borderLeft: '3px solid #10b981' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>PRESENT DAYS</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#10b981' }}>{detailedStats ? detailedStats.totalPresent : 0}</h3>
            </div>
            <div className="card" style={{ padding: '12px', textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700' }}>ABSENT DAYS</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#ef4444' }}>{detailedStats ? detailedStats.totalAbsent : 0}</h3>
            </div>
          </div>

          {/* MONTHLY INTERACTIVE BAR GRAPH */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 6px 0' }}>📊 Monthly Attendance Graph</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Click any month bar to view total present days.</p>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
              {!detailedStats?.monthlyBarGraph || detailedStats.monthlyBarGraph.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No monthly data recorded yet.</span>
              ) : (
                detailedStats.monthlyBarGraph.map((item, idx) => (
                  <div key={idx} onClick={() => setSelectedMonthModal(item)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{
                      height: `${Math.min(item.presentDaysCount * 12 + 20, 90)}px`,
                      background: 'linear-gradient(180deg, #6366f1, #4338ca)',
                      borderRadius: '8px 8px 0 0'
                    }} />
                    <span style={{ fontSize: '0.68rem', display: 'block', marginTop: '6px', color: 'var(--text-muted)' }}>{item.monthLabel}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CLASSROOM CHECK-IN BUTTON */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 6px 0' }}>Classroom Check-In</h4>
            <button
              onClick={handleScanAndMarkAttendance}
              disabled={scanning}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            >
              {scanning ? '📡 Verifying GPS Location...' : '📍 Verify Location & Mark Present'}
            </button>
            {scanMessage && (
              <p style={{ fontSize: '0.8rem', marginTop: '10px', color: scanMessage.type === 'success' ? '#10b981' : '#f87171' }}>
                {scanMessage.text}
              </p>
            )}
          </div>

          {/* SUBJECT-WISE PERIOD COUNTER */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 14px 0' }}>📚 Subject & Period Breakdown</h4>
            {detailedStats && Object.keys(detailedStats.subjects).length > 0 ? (
              Object.entries(detailedStats.subjects).map(([subj, data]) => (
                <div key={subj} style={{ padding: '10px 0', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem' }}>{subj}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Periods: {data.totalPeriods}</div>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                    <span style={{ color: '#10b981', marginRight: '8px' }}>P: {data.present}</span>
                    <span style={{ color: '#ef4444' }}>A: {data.absent}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No subject records found.</p>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY BAR GRAPH DETAIL POPUP */}
      {selectedMonthModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <h3>📅 {selectedMonthModal.monthLabel} Attendance</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#6366f1', margin: '15px 0' }}>
              {selectedMonthModal.presentDaysCount} Days
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total days marked Present in {selectedMonthModal.monthLabel}.</p>
            <button onClick={() => setSelectedMonthModal(null)} className="btn btn-primary" style={{ marginTop: '10px' }}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}