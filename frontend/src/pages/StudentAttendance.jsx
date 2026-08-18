import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Gazetted / Festival Holidays Calendar (YYYY-MM-DD)
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

export default function Student({ darkMode, setDarkMode }) {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [detailedStats, setDetailedStats] = useState(null);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  // History Filter States
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Scanner States & Safe Permissions
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const scannerRef = useRef(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const RESET_KEY = "reset_student_logins_v2";
    if (!localStorage.getItem(RESET_KEY)) {
      localStorage.clear();
      sessionStorage.clear();
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

  // Safe Camera Scanner Initialization via Window Global
  useEffect(() => {
    if (isCameraOpen && !scannerRef.current) {
      setCameraPermissionError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermissionError("Camera access requires HTTPS or is unsupported on this browser.");
        return;
      }

      if (!window.Html5QrcodeScanner) {
        setCameraPermissionError("Scanner library is loading, please try again in a moment.");
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
          setCameraPermissionError("Camera permission denied. Please allow camera access in browser settings.");
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
      console.error("Error loading student stats:", err);
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

  // Calendar Calculation Helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create attendance lookup by date
  const recordsByDate = {};
  if (detailedStats?.recentHistory) {
    detailedStats.recentHistory.forEach(r => {
      if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
      recordsByDate[r.date].push(r);
    });
  }

  // Monthly Counts for the active calendar view
  let monthPresentCount = 0;
  let monthAbsentCount = 0;
  let monthHolidayCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();
    const isHoliday = dayOfWeek === 0 || HOLIDAYS[dStr];
    
    if (isHoliday) {
      monthHolidayCount++;
    } else if (recordsByDate[dStr]) {
      const hasPresent = recordsByDate[dStr].some(r => r.status === 'Present');
      if (hasPresent) monthPresentCount++;
      else monthAbsentCount++;
    }
  }

  const handlePrevMonth = () => setCurrentCalendarDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentCalendarDate(new Date(year, month + 1, 1));

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

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      
      {/* HEADER & CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>⚡ SmartAttend</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Student Attendance Hub</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {setDarkMode && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '10px' }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          )}
          {deferredPrompt && (
            <button onClick={handleInstallPWA} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '10px' }}>
              📲 Install
            </button>
          )}
        </div>
      </div>

      {!studentInfo ? (
        <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎓</div>
          <h3 style={{ marginBottom: '6px' }}>Student Device Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Enter your Roll Number once to bind your profile.
          </p>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="e.g. 2585351122"
              value={rollNoInput}
              onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '14px', marginBottom: '16px', textAlign: 'center', fontWeight: '700', fontSize: '1.05rem' }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px' }}>
              Connect Account →
            </button>
          </form>
        </div>
      ) : (
        <div>
          {/* PROFILE & PERCENTAGE CARD */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>STUDENT PROFILE</span>
              <h3 style={{ margin: '2px 0', fontSize: '1.15rem' }}>{studentInfo.full_name}</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Roll: <strong>{studentInfo.roll_no}</strong> • {studentInfo.dept_code}</span>
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

          {/* OVERALL METRIC COUNTERS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL DAYS</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#818cf8', fontSize: '1.4rem' }}>{detailedStats ? detailedStats.totalWorkingDays : 0}</h3>
            </div>
            <div className="card" style={{ padding: '14px 8px', textAlign: 'center', borderLeft: '3px solid #34d399' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>PRESENT</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#34d399', fontSize: '1.4rem' }}>{detailedStats ? detailedStats.totalPresent : 0}</h3>
            </div>
            <div className="card" style={{ padding: '14px 8px', textAlign: 'center', borderLeft: '3px solid #f87171' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>ABSENT</span>
              <h3 style={{ margin: '4px 0 0 0', color: '#f87171', fontSize: '1.4rem' }}>{detailedStats ? detailedStats.totalAbsent : 0}</h3>
            </div>
          </div>

          {/* SCANNER ACTION */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <button
              onClick={() => setIsCameraOpen(true)}
              disabled={scanning}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700' }}
            >
              {scanning ? '📡 Verifying Location...' : '📷 Scan Class QR'}
            </button>

            {scanMessage && (
              <p style={{ fontSize: '0.82rem', marginTop: '12px', fontWeight: '600', color: scanMessage.type === 'success' ? '#34d399' : '#f87171' }}>
                {scanMessage.text}
              </p>
            )}
          </div>

          {/* ATTENDANCE CALENDAR VIEW */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }}>◀</button>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>{monthNames[month]} {year}</h4>
              <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }}>▶</button>
            </div>

            {/* MONTHLY SUMMARY METRIC PILLS */}
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0', marginBottom: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#10b981' }}>PRESENT</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>{monthPresentCount}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#ef4444' }}>ABSENT</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ef4444' }}>{monthAbsentCount}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#38bdf8' }}>HOLIDAYS</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#38bdf8' }}>{monthHolidayCount}</div>
              </div>
            </div>

            {/* DAYS OF WEEK */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <div key={d} style={{ color: i === 0 ? '#38bdf8' : 'inherit' }}>{d}</div>
              ))}
            </div>

            {/* CALENDAR DAYS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} style={{ height: '36px' }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayOfWeek = new Date(year, month, dayNum).getDay();
                const holidayName = HOLIDAYS[dStr] || (dayOfWeek === 0 ? "Sunday" : null);

                const dayRecords = recordsByDate[dStr];
                const isPresent = dayRecords?.some(r => r.status === 'Present');
                const isAbsent = dayRecords && !isPresent;

                let bgColor = 'var(--card-bg)';
                let textColor = 'var(--text-main)';
                let borderColor = 'var(--glass-border)';

                if (holidayName) {
                  bgColor = 'rgba(56, 189, 248, 0.18)';
                  textColor = '#38bdf8';
                  borderColor = '#38bdf8';
                } else if (isPresent) {
                  bgColor = 'rgba(16, 185, 129, 0.22)';
                  textColor = '#10b981';
                  borderColor = '#10b981';
                } else if (isAbsent) {
                  bgColor = 'rgba(239, 68, 68, 0.22)';
                  textColor = '#ef4444';
                  borderColor = '#ef4444';
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
                      borderRadius: '10px',
                      background: bgColor,
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>

            {/* COLOR LEGEND */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '16px', fontSize: '0.72rem', fontWeight: '700', flexWrap: 'wrap' }}>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>🟢 Present</span>
              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>🔴 Absent</span>
              <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>🔵 Holiday</span>
            </div>
          </div>

          {/* SUBJECT-LEVEL PROGRESS BARS */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>📚 Subject & Period Breakdown</h4>
            {detailedStats && Object.keys(detailedStats.subjects).length > 0 ? (
              Object.entries(detailedStats.subjects).map(([subj, data]) => {
                const subPct = data.totalPeriods > 0 ? Math.round((data.present / data.totalPeriods) * 100) : 0;
                const isSubSafe = subPct >= 75;

                return (
                  <div key={subj} style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>{subj}</strong>
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: isSubSafe ? '#10b981' : '#ef4444' }}>
                        {subPct}% ({data.present}/{data.totalPeriods})
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${subPct}%`,
                        height: '100%',
                        background: isSubSafe ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                        borderRadius: '6px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No class records found.</p>
            )}
          </div>

          {/* RECENT ATTENDANCE HISTORY LOG */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem' }}>🕒 Attendance Activity Log</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredHistory.length} record(s)</span>
            </div>

            {/* QUICK DATE RANGE TABS */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[
                { label: 'All', value: 'ALL' },
                { label: 'Past 7 Days', value: 'WEEK' },
                { label: 'Past 30 Days', value: 'MONTH' },
                { label: 'Custom', value: 'CUSTOM' }
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setDateRangeFilter(tab.value)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.74rem',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', display: 'block', marginBottom: '2px' }}>From</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '0.78rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', display: 'block', marginBottom: '2px' }}>To</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '0.78rem' }}
                  />
                </div>
              </div>
            )}

            {/* SEARCH INPUT */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Search by date (YYYY-MM-DD), hour, or status..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--card-bg)'
                }}
              />
            </div>

            {/* HISTORY LIST */}
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {filteredHistory.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0' }}>
                  No matching attendance records found.
                </p>
              ) : (
                filteredHistory.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--glass-border)'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.82rem' }}>{item.date}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.hour}</div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '8px',
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

      {/* DAY DETAILS MODAL */}
      {selectedDayModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3>📅 {selectedDayModal.date}</h3>

            {selectedDayModal.holiday && (
              <div style={{ margin: '14px 0', padding: '12px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', fontWeight: '700' }}>
                🎉 Holiday: {selectedDayModal.holiday}
              </div>
            )}

            {selectedDayModal.records.length > 0 ? (
              <div style={{ margin: '14px 0', textAlign: 'left' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>SESSION ACTIVITY:</span>
                {selectedDayModal.records.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                    <span>{r.hour}</span>
                    <strong style={{ color: r.status === 'Present' ? '#10b981' : '#ef4444' }}>{r.status}</strong>
                  </div>
                ))}
              </div>
            ) : !selectedDayModal.holiday ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '16px 0' }}>No attendance sessions recorded on this day.</p>
            ) : null}

            <button onClick={() => setSelectedDayModal(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL */}
      {isCameraOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📷 Classroom QR Scanner</h3>

            {cameraPermissionError ? (
              <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>
                <p><strong>⚠️ Camera Blocked</strong></p>
                <p style={{ margin: '6px 0' }}>{cameraPermissionError}</p>
                <small>Tap the lock icon in your browser URL bar to allow Camera permissions, then reload.</small>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Point camera at the classroom projector screen.
                </p>
                <div id="qr-reader-container" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>
              </div>
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
              style={{ marginTop: '16px', width: '100%' }}
            >
              Close Camera
            </button>
          </div>
        </div>
      )}

    </div>
  );
}