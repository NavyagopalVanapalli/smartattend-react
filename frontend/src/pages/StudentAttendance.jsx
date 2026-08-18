import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Timetable Schedule Configuration
const SCHEDULE = [
  { hour: "Hour 1 (09:00 AM)", start: 9, end: 10, label: "09:00 AM - 10:00 AM" },
  { hour: "Hour 2 (10:00 AM)", start: 10, end: 11, label: "10:00 AM - 11:00 AM" },
  { hour: "Hour 3 (11:15 AM)", start: 11, end: 12, label: "11:15 AM - 12:15 PM" },
  { hour: "Hour 4 (12:15 PM)", start: 12, end: 13, label: "12:15 PM - 01:15 PM" }
];

export default function Student() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [detailedStats, setDetailedStats] = useState(null);
  const [selectedMonthModal, setSelectedMonthModal] = useState(null);

  // Scanner States & Safe Permissions
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [cameraPermissionError, setCameraPermissionError] = useState(null);
  const scannerRef = useRef(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. One-time login reset check
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

    // 2. PWA Install Listener
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Initialize and clean up camera scanner
  useEffect(() => {
    if (isCameraOpen && !scannerRef.current) {
      setCameraPermissionError(null);

      // Verify Browser Support & Permissions
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermissionError("Camera access requires HTTPS or is unsupported on this browser.");
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(() => {
          const scanner = new Html5QrcodeScanner(
            "qr-reader-container",
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
            false
          );
          scanner.render(onScanSuccess, onScanFailure);
          scannerRef.current = scanner;
        })
        .catch((err) => {
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

  const handleUnlinkDevice = () => {
    if (confirm("Disconnect this device and switch Roll Number?")) {
      localStorage.removeItem("student_profile");
      setStudentInfo(null);
      setDetailedStats(null);
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
            // Automatic live refresh after successful scan
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

  // Determine current active class hour
  const currentHour = new Date().getHours();
  const currentPeriod = SCHEDULE.find(s => currentHour >= s.start && currentHour < s.end);

  const percentage = detailedStats ? detailedStats.attendancePercentage : 0;
  const isSafe = percentage >= 75;
  const isWarning = percentage >= 65 && percentage < 75;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      
      {/* HEADER & PWA INSTALL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', margin: 0 }}>⚡ SmartAttend</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Student Self-Service Portal</span>
        </div>
        {deferredPrompt && (
          <button onClick={handleInstallPWA} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            📲 Install App
          </button>
        )}
      </div>

      {!studentInfo ? (
        <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎓</div>
          <h3 style={{ marginBottom: '6px' }}>Student Device Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Enter your Roll Number once to link this mobile device.
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
          {/* PROFILE & 75% BADGE CARD */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>LINKED PROFILE</span>
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

          {/* TODAY SCHEDULE & CURRENT HOUR HIGHLIGHT */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TODAY'S SCHEDULE</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '10px' }}>
              {SCHEDULE.map(s => {
                const isActive = currentPeriod?.hour === s.hour;
                return (
                  <div key={s.hour} style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'var(--card-bg)',
                    border: isActive ? '1px solid #818cf8' : '1px solid var(--glass-border)',
                    color: isActive ? '#818cf8' : 'var(--text-main)',
                    fontWeight: isActive ? '700' : '500'
                  }}>
                    {isActive && '🔴 Live: '}{s.hour.split(' ')[0]} ({s.label})
                  </div>
                );
              })}
            </div>
          </div>

          {/* OVERALL METRICS CARDS */}
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

          {/* RECENT ATTENDANCE HISTORY LOG */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>🕒 Recent Attendance Activity</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {!detailedStats?.recentHistory || detailedStats.recentHistory.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No recent records found.</p>
              ) : (
                detailedStats.recentHistory.map((item, idx) => (
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

          {/* UNLINK PROFILE BUTTON */}
          <button onClick={handleUnlinkDevice} className="btn btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '0.82rem', marginBottom: '20px' }}>
            🔄 Unlink Profile / Switch Roll No
          </button>
        </div>
      )}

      {/* CAMERA SCANNER MODAL WITH FALLBACK PERMISSION PROMPT */}
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