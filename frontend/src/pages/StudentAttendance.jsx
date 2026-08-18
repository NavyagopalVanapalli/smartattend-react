import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Student() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [detailedStats, setDetailedStats] = useState(null);
  const [selectedMonthModal, setSelectedMonthModal] = useState(null);

  // QR Camera Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    // 1. One-time reset check
    const RESET_KEY = "reset_student_logins_v2";
    const HAS_RESET = localStorage.getItem(RESET_KEY);

    if (!HAS_RESET) {
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
  }, []);

  // Initialize and clean up Html5QrcodeScanner camera
  useEffect(() => {
    if (isCameraOpen && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Scanner cleanup error:", err));
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
      console.error("Error fetching detailed stats:", err);
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
      } else {
        alert("Roll Number not found in system.");
      }
    } catch (err) {
      alert("Roll Number not registered in system. Please contact your faculty.");
    }
  };

  // Called when the camera detects a valid QR code
  const onScanSuccess = (decodedText) => {
    // Extract sessionId from URL or plain sessionId
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
      setScanMessage({ type: 'error', text: '❌ Invalid QR Code scanned.' });
    }
  };

  const onScanFailure = () => {
    // Silent error handler for camera frames without QR codes
  };

  // Geolocation Verification & Submission
  const verifyLocationAndMarkAttendance = (sessionId) => {
    if (!navigator.geolocation) {
      setScanMessage({ type: 'error', text: 'Geolocation is not supported on this device.' });
      return;
    }

    setScanning(true);
    setScanMessage({ type: 'info', text: '📡 Verifying GPS classroom coordinates...' });

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
          const errorMsg = err.response?.data?.message || 'Verification failed. Make sure you are inside the classroom.';
          setScanMessage({ type: 'error', text: `❌ ${errorMsg}` });
        } finally {
          setScanning(false);
        }
      },
      () => {
        setScanning(false);
        setScanMessage({ type: 'error', text: '📍 Please enable GPS/Location permissions on your browser.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      
      {/* BRANDING HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          ⚡ SmartAttend
        </h2>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Student Self-Service Portal</span>
      </div>

      {!studentInfo ? (
        <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎓</div>
          <h3 style={{ marginBottom: '6px' }}>Student Device Link</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Enter your Roll Number once to bind this mobile device.
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
          {/* PROFILE CARD */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>LINKED DEVICE</span>
            <h3 style={{ margin: '4px 0 2px 0', fontSize: '1.2rem' }}>{studentInfo.full_name}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Roll: <strong style={{ color: 'var(--text-main)' }}>{studentInfo.roll_no}</strong> • {studentInfo.dept_code}</span>
          </div>

          {/* OVERALL SUMMARY STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700' }}>WORKING DAYS</span>
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

          {/* IN-APP CAMERA SCANNER ACTION CARD */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 6px 0' }}>📷 Live Classroom Check-In</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Open camera, scan faculty QR, and verify GPS automatically.
            </p>
            
            <button
              onClick={() => setIsCameraOpen(true)}
              disabled={scanning}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700' }}
            >
              {scanning ? '📡 Verifying GPS...' : '📷 Scan Class QR'}
            </button>

            {scanMessage && (
              <p style={{ fontSize: '0.82rem', marginTop: '12px', fontWeight: '600', color: scanMessage.type === 'success' ? '#34d399' : '#f87171' }}>
                {scanMessage.text}
              </p>
            )}
          </div>

          {/* MONTHLY BAR GRAPH */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 4px 0' }}>📊 Monthly Attendance Graph</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Tap a month bar to view total present days.</p>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '120px', paddingBottom: '10px', borderBottom: '1px solid var(--glass-border)' }}>
              {!detailedStats?.monthlyBarGraph || detailedStats.monthlyBarGraph.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No monthly attendance logged yet.</span>
              ) : (
                detailedStats.monthlyBarGraph.map((item, idx) => (
                  <div key={idx} onClick={() => setSelectedMonthModal(item)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{
                      height: `${Math.min(item.presentDaysCount * 12 + 20, 90)}px`,
                      background: 'linear-gradient(180deg, #818cf8, #4f46e5)',
                      borderRadius: '8px 8px 0 0'
                    }} />
                    <span style={{ fontSize: '0.68rem', display: 'block', marginTop: '6px', color: 'var(--text-muted)' }}>{item.monthLabel}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SUBJECT BREAKDOWN */}
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
                    <span style={{ color: '#34d399', marginRight: '8px' }}>P: {data.present}</span>
                    <span style={{ color: '#f87171' }}>A: {data.absent}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No class records found.</p>
            )}
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL POPUP */}
      {isCameraOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>📷 Scan Class QR</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Point your camera at the teacher's screen QR code.
            </p>
            
            <div id="qr-reader-container" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>
            
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
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* MONTHLY BAR MODAL */}
      {selectedMonthModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <h3>📅 {selectedMonthModal.monthLabel} Attendance</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#818cf8', margin: '15px 0' }}>
              {selectedMonthModal.presentDaysCount} Days
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total days marked Present in {selectedMonthModal.monthLabel}.</p>
            <button onClick={() => setSelectedMonthModal(null)} className="btn btn-primary" style={{ marginTop: '14px', width: '100%' }}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}