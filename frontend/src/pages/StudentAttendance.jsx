import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function StudentAttendance() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [detailedStats, setDetailedStats] = useState(null);
  const [selectedMonthModal, setSelectedMonthModal] = useState(null);

  // History Filter States
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const scannerRef = useRef(null);

  // Leave & OD States
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'OD',
    from_date: '',
    to_date: '',
    reason: ''
  });

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const RESET_KEY = "reset_student_logins_v2";
    if (!localStorage.getItem(RESET_KEY)) {
      localStorage.removeItem("student_profile");
      localStorage.setItem(RESET_KEY, "true");
      setStudentInfo(null);
      setDetailedStats(null);
    } else {
      const savedStudent = localStorage.getItem("student_profile");
      if (savedStudent) {
        const parsed = JSON.parse(savedStudent);
        setStudentInfo(parsed);
        fetchDetailedStats(parsed.roll_no);
      }
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (isCameraOpen) {
      setCameraPermissionError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermissionError("Camera access requires HTTPS or is unsupported on this browser.");
        return;
      }

      import('html5-qrcode')
        .then(({ Html5QrcodeScanner }) => {
          if (isCancelled) return;

          try {
            const scanner = new Html5QrcodeScanner(
              "qr-reader-container",
              { 
                fps: 10, 
                qrbox: { width: 220, height: 220 },
                aspectRatio: 1.0,
                videoConstraints: { facingMode: { ideal: "environment" } }
              },
              false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
          } catch (err) {
            setCameraPermissionError("Failed to initialize camera. Check browser permissions.");
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setCameraPermissionError("Failed to load QR scanner component. Please refresh.");
          }
        });
    }

    return () => {
      isCancelled = true;
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
      console.error("Error loading stats:", err);
    }
  };

  const fetchLeaveHistory = async () => {
    if (!studentInfo?.roll_no) return;
    try {
      const res = await axios.get(`/api/leaves/student?roll_no=${studentInfo.roll_no}`);
      if (res.data && res.data.success) {
        setLeaveHistory(res.data.leaves);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/leaves/apply', {
        roll_no: studentInfo.roll_no,
        student_name: studentInfo.full_name,
        dept_code: studentInfo.dept_code,
        ...leaveForm
      });
      if (res.data.success) {
        alert('Application submitted successfully!');
        setLeaveForm({ leave_type: 'OD', from_date: '', to_date: '', reason: '' });
        fetchLeaveHistory();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting application');
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
      alert("Roll Number not registered in system. Please contact faculty.");
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
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
    } else {
      setScanMessage({ type: 'error', text: '❌ Invalid QR Code format scanned.' });
    }
  };

  const onScanFailure = () => {};

  const verifyLocationAndMarkAttendance = (sessionId) => {
    if (!navigator.geolocation) {
      setScanMessage({ type: 'error', text: 'Geolocation unsupported on this device.' });
      return;
    }

    setScanning(true);
    setScanMessage({ type: 'info', text: '📡 Verifying classroom GPS location...' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await axios.post('/api/qr/verify-student', {
            rollNo: studentInfo.roll_no,
            studentLat: position.coords.latitude,
            studentLng: position.coords.longitude,
            sessionId: sessionId
          });

          if (res.data && res.data.success) {
            setScanMessage({ type: 'success', text: `✅ Verified! Attendance marked PRESENT.` });
            fetchDetailedStats(studentInfo.roll_no);
          }
        } catch (err) {
          const msg = err.response?.data?.message || 'Location verification failed. Be inside classroom.';
          setScanMessage({ type: 'error', text: `❌ ${msg}` });
        } finally {
          setScanning(false);
        }
      },
      () => {
        setScanning(false);
        setScanMessage({ type: 'error', text: '📍 Please allow GPS location permission in your browser.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const percentage = detailedStats ? detailedStats.attendancePercentage : 0;
  const isSafe = percentage >= 75;
  const isWarning = percentage >= 65 && percentage < 75;

  const filteredHistory = (detailedStats?.recentHistory || []).filter(item => {
    const matchesSearch = item.date.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      item.hour.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(historySearchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const itemDate = new Date(item.date);
    const now = new Date();

    if (dateRangeFilter === 'WEEK') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return itemDate >= weekAgo;
    } else if (dateRangeFilter === 'MONTH') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return itemDate >= monthAgo;
    } else if (dateRangeFilter === 'CUSTOM') {
      if (customStartDate && item.date < customStartDate) return false;
      if (customEndDate && item.date > customEndDate) return false;
      return true;
    }

    return true;
  });

  // Background auto-polling for real-time leave approvals
  useEffect(() => {
    if (!studentInfo?.roll_no) return;
    const pollInterval = setInterval(() => {
      fetchLeaveHistory();
      fetchDetailedStats(studentInfo.roll_no);
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [studentInfo]);

  return (
    <div style={{ width: '100%', maxWidth: '580px', margin: '0 auto', padding: '16px 12px', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* HEADER & PWA INSTALL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>⚡ SmartAttend</h2>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Student Self-Service Portal</span>
        </div>
        {deferredPrompt && (
          <button onClick={handleInstallPWA} className="btn btn-secondary" style={{ fontSize: '0.76rem', padding: '6px 12px' }}>
            📲 Install App
          </button>
        )}
      </div>

      {!studentInfo ? (
        <div className="card" style={{ padding: 'clamp(20px, 5vw, 32px)', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎓</div>
          <h3 style={{ marginBottom: '6px' }}>Student Device Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Enter your Roll Number once to link this mobile device permanently.
          </p>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="e.g. 2585351122"
              value={rollNoInput}
              onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '700', fontSize: '1rem' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '700' }}>
              Connect Account →
            </button>
          </form>
        </div>
      ) : (
        <div>
          {/* PROFILE & BADGE CARD */}
          <div className="card" style={{ padding: '16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ minWidth: '180px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.8px' }}>LINKED PROFILE</span>
              <h3 style={{ margin: '2px 0', fontSize: 'clamp(1rem, 3.5vw, 1.15rem)' }}>{studentInfo.full_name}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Roll: <strong>{studentInfo.roll_no}</strong> • {studentInfo.dept_code}</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '800',
                background: isSafe ? 'rgba(16, 185, 129, 0.15)' : isWarning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isSafe ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444',
                border: `1px solid ${isSafe ? '#10b981' : isWarning ? '#f59e0b' : '#ef4444'}`
              }}>
                {percentage}%
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', marginTop: '4px', color: isSafe ? '#10b981' : '#ef4444' }}>
                {isSafe ? '✅ Safe (≥75%)' : isWarning ? '⚠️ Low Attendance' : '🚨 Shortage (<65%)'}
              </div>
            </div>
          </div>

          {/* OVERALL METRICS CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
            <div className="card" style={{ padding: '12px 6px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL DAYS</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#818cf8', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}>{detailedStats ? detailedStats.totalWorkingDays : 0}</h3>
            </div>
            <div className="card" style={{ padding: '12px 6px', textAlign: 'center', borderLeft: '3px solid #34d399' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '700' }}>PRESENT</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#34d399', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}>{detailedStats ? detailedStats.totalPresent : 0}</h3>
            </div>
            <div className="card" style={{ padding: '12px 6px', textAlign: 'center', borderLeft: '3px solid #f87171' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '700' }}>ABSENT</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#f87171', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}>{detailedStats ? detailedStats.totalAbsent : 0}</h3>
            </div>
          </div>

          {/* DUAL ACTION BUTTONS: LEAVES & CAMPUS HUB */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            <button
              onClick={() => { setShowLeaveModal(true); fetchLeaveHistory(); }}
              className="btn btn-secondary"
              style={{ padding: '10px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '0.8rem', textAlign: 'center' }}
            >
              📄 OD / Leave
            </button>
            <button
              onClick={() => window.location.href = '/hub'}
              className="btn btn-primary"
              style={{ padding: '10px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '0.8rem', textAlign: 'center' }}
            >
              🏛️ Campus Hub & Notes
            </button>
          </div>

          {/* SCANNER ACTION */}
          <div className="card" style={{ padding: '16px', marginBottom: '14px', textAlign: 'center' }}>
            <button
              onClick={() => setIsCameraOpen(true)}
              disabled={scanning}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '700' }}
            >
              {scanning ? '📡 Verifying Location...' : '📷 Scan Class QR'}
            </button>

            {scanMessage && (
              <p style={{ fontSize: '0.82rem', marginTop: '10px', fontWeight: '600', color: scanMessage.type === 'success' ? '#34d399' : '#f87171', wordBreak: 'break-word' }}>
                {scanMessage.text}
              </p>
            )}
          </div>

          {/* SUBJECT PROGRESS BARS */}
          <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem' }}>📚 Subject & Period Breakdown</h4>
            {detailedStats && Object.keys(detailedStats.subjects).length > 0 ? (
              Object.entries(detailedStats.subjects).map(([subj, data]) => {
                const subPct = data.totalPeriods > 0 ? Math.round((data.present / data.totalPeriods) * 100) : 0;
                const isSubSafe = subPct >= 75;

                return (
                  <div key={subj} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.82rem' }}>
                      <strong style={{ wordBreak: 'break-word', maxWidth: '70%' }}>{subj}</strong>
                      <span style={{ fontWeight: '700', color: isSubSafe ? '#10b981' : '#ef4444' }}>
                        {subPct}% ({data.present}/{data.totalPeriods})
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${subPct}%`,
                        height: '100%',
                        background: isSubSafe ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                        borderRadius: '6px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No class records found.</p>
            )}
          </div>

          {/* MONTHLY ATTENDANCE BAR GRAPH */}
          <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem' }}>📊 Monthly Attendance Graph</h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Tap a month bar to view total present days.</p>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)', overflowX: 'auto' }}>
              {!detailedStats?.monthlyBarGraph || detailedStats.monthlyBarGraph.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No monthly attendance logged yet.</span>
              ) : (
                detailedStats.monthlyBarGraph.map((item, idx) => (
                  <div key={idx} onClick={() => setSelectedMonthModal(item)} style={{ flex: 1, minWidth: '40px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{
                      height: `${Math.min(item.presentDaysCount * 12 + 18, 85)}px`,
                      background: 'linear-gradient(180deg, #818cf8, #4f46e5)',
                      borderRadius: '6px 6px 0 0'
                    }} />
                    <span style={{ fontSize: '0.64rem', display: 'block', marginTop: '4px', color: 'var(--text-muted)' }}>{item.monthLabel}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ATTENDANCE HISTORY LOG */}
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem' }}>🕒 Attendance Log</h4>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{filteredHistory.length} record(s)</span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
              {[
                { label: 'All', value: 'ALL' },
                { label: '7 Days', value: 'WEEK' },
                { label: '30 Days', value: 'MONTH' },
                { label: 'Custom', value: 'CUSTOM' }
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setDateRangeFilter(tab.value)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: dateRangeFilter === tab.value ? 'var(--primary)' : 'var(--card-bg)',
                    color: dateRangeFilter === tab.value ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {dateRangeFilter === 'CUSTOM' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  style={{ width: '100%', padding: '6px', fontSize: '0.76rem' }}
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  style={{ width: '100%', padding: '6px', fontSize: '0.76rem' }}
                />
              </div>
            )}

            <input
              type="text"
              placeholder="🔍 Search date, hour, status..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '10px' }}
            />

            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredHistory.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0' }}>No attendance records found.</p>
              ) : (
                filteredHistory.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem' }}>
                    <div>
                      <strong>{item.date}</strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.hour}</div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: item.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: item.status === 'Present' ? '#10b981' : '#ef4444'
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL */}
      {isCameraOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>📷 Classroom QR Scanner</h3>
            {cameraPermissionError ? (
              <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px' }}>
                {cameraPermissionError}
              </div>
            ) : (
              <div id="qr-reader-container" style={{ width: '100%', borderRadius: '14px', overflow: 'hidden' }}></div>
            )}
            <button
              onClick={() => {
                if (scannerRef.current) {
                  scannerRef.current.clear().catch(() => {});
                  scannerRef.current = null;
                }
                setIsCameraOpen(false);
              }}
              className="btn btn-secondary"
              style={{ marginTop: '14px', width: '100%' }}
            >
              Close Camera
            </button>
          </div>
        </div>
      )}

      {/* MONTHLY BAR MODAL */}
      {selectedMonthModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '340px' }}>
            <h3>📅 {selectedMonthModal.monthLabel}</h3>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#818cf8', margin: '12px 0' }}>
              {selectedMonthModal.presentDaysCount} Days
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total days marked Present.</p>
            <button onClick={() => setSelectedMonthModal(null)} className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }}>Close</button>
          </div>
        </div>
      )}

      {/* OD & MEDICAL LEAVE MODAL */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📄 OD & Medical Portal</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Request Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="OD">On-Duty (OD) Event / Fest</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Personal">Personal Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>From Date</label>
                  <input
                    type="date"
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>To Date</label>
                  <input
                    type="date"
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    style={{ width: '100%', padding: '8px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Reason</label>
                <textarea
                  rows="2"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="e.g. Hackathon or Illness"
                  style={{ width: '100%', padding: '8px', fontSize: '0.82rem' }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontWeight: '700' }}>
                Submit Leave Request
              </button>
            </form>

            <h4 style={{ margin: '10px 0 6px 0', fontSize: '0.85rem' }}>Recent Applications</h4>
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {leaveHistory.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No previous requests found.</p>
              ) : (
                leaveHistory.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.78rem' }}>
                    <div>
                      <strong>{item.leave_type}</strong> ({item.from_date} to {item.to_date})
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.reason}</div>
                    </div>
                    <span style={{
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      height: 'fit-content',
                      background: item.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : item.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: item.status === 'Approved' ? '#10b981' : item.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}