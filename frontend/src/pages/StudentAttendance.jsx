import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [rollNo, setRollNo] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ text: '', isSuccess: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedRoll = localStorage.getItem('assigned_roll_no');
    if (savedRoll) {
      setRollNo(savedRoll);
      setIsLocked(true);
    }
  }, []);

const submitAttendance = () => {
  if (!rollNo.trim()) {
    setStatusMsg({ text: "Please enter your Roll Number.", isSuccess: false });
    return;
  }

  if (!sessionId) {
    setStatusMsg({ text: "Invalid QR link. Session ID missing.", isSuccess: false });
    return;
  }

  setLoading(true);

  const sendRequest = async (lat, lng) => {
    try {
      const res = await axios.post('/api/qr/verify-student', {
        rollNo: rollNo.toUpperCase(),
        studentLat: lat,
        studentLng: lng,
        sessionId
      });

      if (res.data.success) {
        localStorage.setItem('assigned_roll_no', rollNo.toUpperCase());
        setIsLocked(true);
        setStatusMsg({ text: res.data.message, isSuccess: true });
      }
    } catch (err) {
      setStatusMsg({ 
        text: err.response?.data?.message || "Failed to verify location.", 
        isSuccess: false 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!navigator.geolocation) {
    // Fallback if browser blocks GPS completely
    sendRequest(16.5449, 81.5212); // Default fallback coords
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      sendRequest(position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      // If user/browser denies GPS, inform user or execute controlled fallback
      setStatusMsg({ 
        text: "GPS blocked by browser over HTTP. Please enable Chrome flags or allow Location in Site Settings.", 
        isSuccess: false 
      });
      setLoading(false);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '30px' }}>
        <h2>📍 Class Attendance</h2>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Enter your Roll Number to verify classroom location and submit attendance.</p>

        <div className="input-group">
          <label>Roll Number</label>
          <input 
            type="text" 
            value={rollNo} 
            onChange={(e) => setRollNo(e.target.value)} 
            readOnly={isLocked}
            placeholder="e.g. 2585351101" 
          />
        </div>

        <button onClick={submitAttendance} disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? "Verifying GPS..." : "Submit Attendance"}
        </button>

        {statusMsg.text && (
          <div className={`status-msg ${statusMsg.isSuccess ? 'success' : 'error'}`} style={{ marginTop: '15px' }}>
            {statusMsg.text}
          </div>
        )}

        {isLocked && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '15px' }}>
            🔒 Device locked to Roll No: {rollNo}
          </div>
        )}
      </div>
    </div>
  );
}