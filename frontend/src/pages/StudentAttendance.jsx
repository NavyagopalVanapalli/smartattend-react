import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Student() {
  const [studentInfo, setStudentInfo] = useState(null);
  const [rollNoInput, setRollNoInput] = useState('');
  const [attendanceStats, setAttendanceStats] = useState(null);

  useEffect(() => {
    // 1. ONE-TIME WIPE FOR INCORRECT ROLL NUMBERS
    const HAS_RESET = localStorage.getItem("reset_wrong_rollno_v1");
    if (!HAS_RESET) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("reset_wrong_rollno_v1", "true");
    }

    // 2. Load saved student if exists
    const savedStudent = localStorage.getItem("student_profile");
    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      setStudentInfo(parsed);
      fetchStudentStats(parsed.roll_no);
    }
  }, []);

  // Fetch Weekly & Monthly Attendance Stats
  const fetchStudentStats = async (rollNo) => {
    try {
      const res = await axios.get(`/api/student/stats?roll_no=${rollNo}`);
      setAttendanceStats(res.data);
    } catch (err) {
      console.error("Error fetching student stats:", err);
    }
  };

  // Save new roll number registration
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
        alert("Roll Number not found in system. Please contact faculty.");
      }
    } catch (err) {
      alert("Error verifying Roll Number.");
    }
  };

  // Reset local registration manually
  const handleClearProfile = () => {
    localStorage.removeItem("student_profile");
    setStudentInfo(null);
    setAttendanceStats(null);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
      
      {/* STEP A: IF NO SAVED STUDENT -> SHOW REGISTRATION FORM */}
      {!studentInfo ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <h2>🎓 Student Registration</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
            Enter your Roll Number once to connect your device.
          </p>

          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Enter Roll Number (e.g. 21CS01)"
              value={rollNoInput}
              onChange={(e) => setRollNoInput(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                marginBottom: '15px',
                textAlign: 'center',
                fontWeight: '700'
              }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Save & Continue
            </button>
          </form>
        </div>
      ) : (

        /* STEP B: STUDENT DASHBOARD + ATTENDANCE PERCENTAGE */
        <div>
          {/* Header Card */}
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{studentInfo.full_name}</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Roll: <strong>{studentInfo.roll_no}</strong> | Dept: {studentInfo.dept_code}
                </span>
              </div>
              <button 
                onClick={handleClearProfile} 
                style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Change Roll No
              </button>
            </div>
          </div>

          {/* ATTENDANCE PERCENTAGE CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            
            {/* WEEKLY PERCENTAGE */}
            <div className="card" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #4f46e5' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>WEEKLY ATTENDANCE</span>
              <h2 style={{ fontSize: '1.8rem', color: '#4f46e5', margin: '8px 0 0 0' }}>
                {attendanceStats ? `${attendanceStats.weeklyPercentage}%` : '...'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {attendanceStats ? `${attendanceStats.weeklyPresent}/${attendanceStats.weeklyTotal} Hours` : ''}
              </span>
            </div>

            {/* MONTHLY PERCENTAGE */}
            <div className="card" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>MONTHLY ATTENDANCE</span>
              <h2 style={{ fontSize: '1.8rem', color: '#10b981', margin: '8px 0 0 0' }}>
                {attendanceStats ? `${attendanceStats.monthlyPercentage}%` : '...'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {attendanceStats ? `${attendanceStats.monthlyPresent}/${attendanceStats.monthlyTotal} Hours` : ''}
              </span>
            </div>

          </div>

          {/* QR SCAN BUTTON AREA */}
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <h4>Mark Attendance</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Make sure location (GPS) is enabled on your device when submitting.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}