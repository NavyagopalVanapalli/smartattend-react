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

  // Unified Dark Mode State tied to document body / root class
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("student_dark") === "true");

  useEffect(() => {
    localStorage.setItem("student_dark", darkMode);
    if (darkMode) {
      document.body.style.background = '#090d16';
      document.body.style.color = '#f1f5f9';
    } else {
      document.body.style.background = '#f8fafc';
      document.body.style.color = '#0f172a';
    }
  }, [darkMode]);

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
  const [pendingSessionId, setPendingSessionId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const incomingSessionId = urlParams.get("sessionId");

    const savedStudent = localStorage.getItem("student_profile");
    let currentStudent = null;

    if (savedStudent) {
      try {
        currentStudent = JSON.parse(savedStudent);
        setStudentInfo(currentStudent);
        fetchDetailedStats(currentStudent.roll_no);
      } catch (e) {
        console.error("Error loading saved student profile:", e);
      }
    }

    if (incomingSessionId) {
      if (currentStudent && currentStudent.roll_no) {
        verifyLocationAndMarkAttendance(incomingSessionId, currentStudent);
      } else {
        setPendingSessionId(incomingSessionId);
        setScanMessage({
          type: 'info',
          text: '⚡ Class QR Code scanned! Enter your Roll Number below to connect and mark attendance.'
        });
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

        if (pendingSessionId) {
          verifyLocationAndMarkAttendance(pendingSessionId, studentData);
          setPendingSessionId(null);
        }
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

  const verifyLocationAndMarkAttendance = (sessionId, studentOverride = null) => {
    const activeStudent = studentOverride || studentInfo;
    if (!activeStudent || !activeStudent.roll_no) {
      setScanMessage({ type: 'error', text: 'Please link your Roll Number first.' });
      return;
    }

    setScanning(true);
    setScanMessage({ type: 'info', text: '📡 Verifying classroom GPS location...' });

    const submitLocation = async (lat, lng) => {
      try {
        const res = await axios.post('/api/qr/verify-student', {
          rollNo: activeStudent.roll_no,
          studentLat: lat,
          studentLng: lng,
          sessionId: sessionId
        });

        if (res.data && res.data.success) {
          setScanMessage({
            type: 'success',
            text: res.data.message || `✅ Verified! Attendance marked PRESENT for ${activeStudent.full_name}.`
          });
          fetchDetailedStats(activeStudent.roll_no);
        } else {
          setScanMessage({ type: 'error', text: res.data?.message || 'Verification failed.' });
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Location verification failed. Be inside classroom.';
        setScanMessage({ type: 'error', text: `❌ ${msg}` });
      } finally {
        setScanning(false);
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          submitLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("GPS error, trying fallback:", error);
          submitLocation(0, 0);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      submitLocation(0, 0);
    }
  };

  const totalWorkingDays = detailedStats ? (detailedStats.totalPresent + detailedStats.totalAbsent) : 0;
  const totalPresent = detailedStats ? detailedStats.totalPresent : 0;
  const percentage = detailedStats && totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;
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

  useEffect(() => {
    if (!studentInfo?.roll_no) return;
    const pollInterval = setInterval(() => {
      fetchLeaveHistory();
      fetchDetailedStats(studentInfo.roll_no);
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [studentInfo]);

  const calculateClassesNeeded = () => {
    if (totalWorkingDays === 0) return { type: 'none', count: 0 };
    
    if (percentage >= 75) {
      const safeMisses = Math.floor((totalPresent / 0.75) - totalWorkingDays);
      return { type: 'safe', count: Math.max(0, safeMisses) };
    } else {
      const needed = Math.ceil((0.75 * totalWorkingDays - totalPresent) / 0.25);
      return { type: 'needed', count: Math.max(0, needed) };
    }
  };

  const targetInfo = calculateClassesNeeded();

  // Consistent Theme Token Variables matching Admin/Teacher Panels
  const cardBg = darkMode ? '#1e1b4b' : '#ffffff';
  const cardBorder = darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const textMuted = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc';

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '580px', 
      margin: '0 auto', 
      padding: '16px 12px', 
      minHeight: '100vh', 
      boxSizing: 'border-box',
      backgroundColor: darkMode ? '#0f0c29' : '#f8fafc',
      color: textColor,
      transition: 'background-color 0.3s ease, color 0.3s ease' 
    }}>
      
      {/* HEADER & CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>⚡ SmartAttend</h2>
          <span style={{ fontSize: '0.76rem', color: textMuted }}>Student Self-Service Portal</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: '700',
              border: `1px solid ${cardBorder}`,
              background: cardBg,
              color: textColor,
              cursor: 'pointer'
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          {deferredPrompt && (
            <button 
              onClick={handleInstallPWA} 
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: '700',
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textColor,
                cursor: 'pointer'
              }}
            >
              📲 Install App
            </button>
          )}
        </div>
      </div>

      {scanMessage && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '12px',
          background: scanMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : scanMessage.type === 'info' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${scanMessage.type === 'success' ? '#10b981' : scanMessage.type === 'info' ? '#6366f1' : '#ef4444'}`,
          color: scanMessage.type === 'success' ? '#10b981' : scanMessage.type === 'info' ? '#818cf8' : '#ef4444',
          fontWeight: '700',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div>{scanMessage.text}</div>
          <button 
            type="button"
            onClick={() => setScanMessage(null)} 
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {scanning && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '12px',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid #6366f1',
          color: '#818cf8',
          fontWeight: '700',
          fontSize: '0.88rem',
          textAlign: 'center'
        }}>
          ⏳ Verifying classroom attendance session...
        </div>
      )}

      {!studentInfo ? (
        <div style={{ padding: 'clamp(20px, 5vw, 32px)', textAlign: 'center', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎓</div>
          <h3 style={{ marginBottom: '6px', color: textColor }}>Student Device Link</h3>
          <p style={{ fontSize: '0.82rem', color: textMuted, marginBottom: '14px' }}>
            Enter your Roll Number once to link this mobile device permanently.
          </p>
          {pendingSessionId && (
            <div style={{ padding: '8px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>
              ⚡ Class QR Session Active: Connect your Roll Number to record your attendance!
            </div>
          )}
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="e.g. 2585351122"
              value={rollNoInput}
              onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '700', fontSize: '1rem', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '10px', boxSizing: 'border-box' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '700' }}>
              Connect Account →
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{ padding: '16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div style={{ minWidth: '180px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.8px' }}>LINKED PROFILE</span>
              <h3 style={{ margin: '2px 0', fontSize: 'clamp(1rem, 3.5vw, 1.15rem)', color: textColor }}>{studentInfo.full_name}</h3>
              <span style={{ fontSize: '0.8rem', color: textMuted }}>Roll: <strong>{studentInfo.roll_no}</strong> • {studentInfo.dept_code}</span>
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

          {/* TARGET 75% ATTENDANCE PLANNER CARD */}
          <div style={{ padding: '16px', marginBottom: '14px', background: percentage >= 75 ? (darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)') : (darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)'), border: `1px solid ${percentage >= 75 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: percentage >= 75 ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  🎯 75% Target Goal Planner
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: textColor }}>
                  {targetInfo.type === 'safe' ? (
                    <>You are above 75%. You can safely miss up to <strong>{targetInfo.count} class(es)</strong> without dropping below safety.</>
                  ) : (
                    <>You need to attend the next <strong>{targetInfo.count} consecutive class(es)</strong> to reach the 75% benchmark.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
            <div style={{ padding: '12px 6px', textAlign: 'center', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
              <span style={{ fontSize: '0.62rem', color: textMuted, fontWeight: '700' }}>TOTAL CLASSES</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#818cf8', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}>{totalWorkingDays}</h3>
            </div>
            <div style={{ padding: '12px 6px', textAlign: 'center', borderLeft: '3px solid #34d399', background: cardBg, borderTop: `1px solid ${cardBorder}`, borderRight: `1px solid ${cardBorder}`, borderBottom: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
              <span style={{ fontSize: '0.62rem', color: textMuted, fontWeight: '700' }}>PRESENT</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#34d399', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}>{totalPresent}</h3>
            </div>
            <div style={{ padding: '12px 6px', textAlign: 'center', borderLeft: '3px solid #f87171', background: cardBg, borderTop: `1px solid ${cardBorder}`, borderRight: `1px solid ${cardBorder}`, borderBottom: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
              <span style={{ fontSize: '0.62rem', color: textMuted, fontWeight: '700' }}>ABSENT</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#f87171', fontSize: 'clamp(1.1rem, 4vw, 1.4rem)' }}>{detailedStats ? detailedStats.totalAbsent : 0}</h3>
            </div>
          </div>

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

          <div style={{ padding: '16px', marginBottom: '14px', textAlign: 'center', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
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

          <div style={{ padding: '16px', marginBottom: '14px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: textColor }}>📚 Subject & Period Breakdown</h4>
            {detailedStats && Object.keys(detailedStats.subjects).length > 0 ? (
              Object.entries(detailedStats.subjects).map(([subj, data]) => {
                const subPct = data.totalPeriods > 0 ? Math.round((data.present / data.totalPeriods) * 100) : 0;
                const isSubSafe = subPct >= 75;

                return (
                  <div key={subj} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${cardBorder}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.82rem' }}>
                      <strong style={{ wordBreak: 'break-word', maxWidth: '70%', color: textColor }}>{subj}</strong>
                      <span style={{ fontWeight: '700', color: isSubSafe ? '#10b981' : '#ef4444' }}>
                        {subPct}% ({data.present}/{data.totalPeriods})
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', borderRadius: '6px', overflow: 'hidden' }}>
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
              <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>No class records found.</p>
            )}
          </div>

          <div style={{ padding: '16px', marginBottom: '14px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.92rem', color: textColor }}>📊 Monthly Attendance Graph</h4>
            <p style={{ fontSize: '0.74rem', color: textMuted, marginBottom: '14px' }}>Tap a month bar to view total present days.</p>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', paddingBottom: '8px', borderBottom: `1px solid ${cardBorder}`, overflowX: 'auto' }}>
              {!detailedStats?.monthlyBarGraph || detailedStats.monthlyBarGraph.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: textMuted }}>No monthly attendance logged yet.</span>
              ) : (
                detailedStats.monthlyBarGraph.map((item, idx) => (
                  <div key={idx} onClick={() => setSelectedMonthModal(item)} style={{ flex: 1, minWidth: '40px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{
                      height: `${Math.min(item.presentDaysCount * 12 + 18, 85)}px`,
                      background: 'linear-gradient(180deg, #818cf8, #4f46e5)',
                      borderRadius: '6px 6px 0 0'
                    }} />
                    <span style={{ fontSize: '0.64rem', display: 'block', marginTop: '4px', color: textMuted }}>{item.monthLabel}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: '16px', marginBottom: '20px', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', color: textColor }}>🕒 Attendance Log</h4>
              <span style={{ fontSize: '0.74rem', color: textMuted }}>{filteredHistory.length} record(s)</span>
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
                    border: `1px solid ${cardBorder}`,
                    background: dateRangeFilter === tab.value ? 'var(--primary)' : inputBg,
                    color: dateRangeFilter === tab.value ? '#ffffff' : textColor,
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
                  style={{ width: '100%', padding: '6px', fontSize: '0.76rem', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '8px', boxSizing: 'border-box' }}
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  style={{ width: '100%', padding: '6px', fontSize: '0.76rem', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <input
              type="text"
              placeholder="🔍 Search date, hour, status..."
              value={historySearchTerm}
              onChange={(e) => setHistorySearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '10px', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, boxSizing: 'border-box' }}
            />

            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredHistory.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: textMuted, margin: '6px 0' }}>No attendance records found.</p>
              ) : (
                filteredHistory.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${cardBorder}`, fontSize: '0.8rem' }}>
                    <div>
                      <strong style={{ color: textColor }}>{item.date}</strong>
                      <div style={{ fontSize: '0.7rem', color: textMuted }}>{item.hour}</div>
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
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '380px', background: cardBg, color: textColor, border: `1px solid ${cardBorder}` }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: textColor }}>📷 Classroom QR Scanner</h3>
            {cameraPermissionError ? (
              <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '6px' }}>{cameraPermissionError}</div>
                <div style={{ fontSize: '0.78rem', color: textColor }}>
                  💡 <strong>Tip:</strong> Simply open your phone's regular <strong>Camera app</strong> (or Google Lens) and point it at the teacher's screen QR code to open and mark attendance instantly!
                </div>
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
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '340px', background: cardBg, color: textColor, border: `1px solid ${cardBorder}` }}>
            <h3 style={{ color: textColor }}>📅 {selectedMonthModal.monthLabel}</h3>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#818cf8', margin: '12px 0' }}>
              {selectedMonthModal.presentDaysCount} Days
            </div>
            <p style={{ fontSize: '0.82rem', color: textMuted }}>Total days marked Present.</p>
            <button onClick={() => setSelectedMonthModal(null)} className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }}>Close</button>
          </div>
        </div>
      )}

      {/* OD & MEDICAL LEAVE MODAL */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto', background: cardBg, color: textColor, border: `1px solid ${cardBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: textColor }}>📄 OD & Medical Portal</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: textMuted }}>✕</button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: textMuted }}>Request Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '8px', boxSizing: 'border-box' }}
                >
                  <option value="OD">On-Duty (OD) Event / Fest</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Personal">Personal Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: textMuted }}>From Date</label>
                  <input
                    type="date"
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    style={{ width: '100%', padding: '8px', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '8px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: textMuted }}>To Date</label>
                  <input
                    type="date"
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    style={{ width: '100%', padding: '8px', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '8px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: textMuted }}>Reason</label>
                <textarea
                  rows="2"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="e.g. Hackathon or Illness"
                  style={{ width: '100%', padding: '8px', fontSize: '0.82rem', background: inputBg, color: textColor, border: `1px solid ${cardBorder}`, borderRadius: '8px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px', fontWeight: '700' }}>
                Submit Leave Request
              </button>
            </form>

            <h4 style={{ margin: '10px 0 6px 0', fontSize: '0.85rem', color: textColor }}>Recent Applications</h4>
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {leaveHistory.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: textMuted }}>No previous requests found.</p>
              ) : (
                leaveHistory.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${cardBorder}`, fontSize: '0.78rem' }}>
                    <div>
                      <strong style={{ color: textColor }}>{item.leave_type}</strong> ({item.from_date} to {item.to_date})
                      <div style={{ fontSize: '0.7rem', color: textMuted }}>{item.reason}</div>
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