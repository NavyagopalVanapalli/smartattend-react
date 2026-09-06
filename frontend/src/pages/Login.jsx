import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [teacherId, setTeacherId] = useState('FAC101');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetTeacherId, setResetTeacherId] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [otpStep, setOtpStep] = useState(1);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    // Force light mode on login page
    document.body.classList.remove("dark-mode");
  }, []);

  const handleLogin = async (e) => {
  e.preventDefault();
  if (!teacherId.trim() || !password.trim()) {
    alert("Please enter Faculty ID and Password.");
    return;
  }

  setLoading(true);
  try {
    const res = await axios.post('/api/login', { 
      teacherId: teacherId.trim(), 
      password: password.trim() 
    });
    if (res.data && res.data.success) {
      // Store persistently for mobile shortcuts
      localStorage.setItem("activeTeacher", JSON.stringify(res.data.teacher));
      localStorage.setItem("teacher_session", JSON.stringify(res.data.teacher));
      sessionStorage.setItem("activeTeacher", JSON.stringify(res.data.teacher));
      navigate('/dashboard');
    } else {
      alert("Invalid Faculty ID or Password!");
    }
  } catch (err) {
    alert("Invalid Credentials or Server Error");
  } finally {
    setLoading(false);
  }
};

  const handleRequestOtp = async () => {
    if (!resetTeacherId) {
      alert("Please enter your Faculty ID.");
      return;
    }

    try {
      const res = await axios.post('/api/request-reset-otp', { teacherId: resetTeacherId });
      if (res.data && res.data.success) {
        alert("✅ " + res.data.message);
        setWhatsappUrl(res.data.whatsappUrl);
        setOtpStep(2);
        if (res.data.whatsappUrl) {
          window.open(res.data.whatsappUrl, '_blank');
        }
      }
    } catch (err) {
      alert("Error requesting OTP. Ensure Faculty ID exists.");
    }
  };

  const handleVerifyOtpAndReset = async () => {
    if (!resetTeacherId || !resetOtp || !resetNewPassword) {
      alert("Please fill in Faculty ID, OTP, and New Password.");
      return;
    }

    try {
      const res = await axios.post('/api/verify-otp-reset-password', {
        teacherId: resetTeacherId,
        otp: resetOtp,
        newPassword: resetNewPassword
      });

      if (res.data && res.data.success) {
        alert("✅ " + res.data.message);
        setIsForgotModalOpen(false);
        setResetTeacherId('');
        setResetOtp('');
        setResetNewPassword('');
        setOtpStep(1);
      }
    } catch (err) {
      alert("Invalid OTP code or request expired.");
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'radial-gradient(circle at 20% 20%, rgba(225, 226, 255, 0.35), transparent 40%), linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(50, 50, 50, 0.9)), url("/bvraju.jpg") center / cover no-repeat',
      position: 'relative'
    }}>
      
      {/* SPLIT CARD */}
      <div style={{
        display: 'flex',
        width: '850px',
        maxWidth: '92%',
        minHeight: '440px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}>
        
        {/* LEFT PANEL */}
        <div style={{
          flex: 1,
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          borderRight: '1px solid rgba(226, 232, 240, 0.6)',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          <img src="/Srivishnu_Logo.jpg" alt="Logo" style={{ height: '90px', width: '90px', marginBottom: '10px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5', margin: '10px 0 6px 0' }}>
            Sri Vishnu Smart Attendance
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6', maxWidth: '320px' }}>
            SmartAttend helps faculty manage hourly class attendance seamlessly, track automated WhatsApp alerts for absentees, and view instant summary analytics.
          </p>
        </div>

        {/* MIDDLE BOOK DIVIDER */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: '#4f46e5',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          zIndex: 2
        }}>
          📖
        </div>

        {/* RIGHT PANEL */}
        <div style={{
          flex: 1,
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.8rem', letterSpacing: '0.05em' }}>
            LOGIN
          </h2>
          
          <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="Your Email / Faculty ID *" 
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                border: '1px solid rgba(200, 200, 200, 0.6)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#ffffff'
              }}
              required 
            />

            <div className="pwd-wrapper" style={{ width: '100%', position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Your Password *" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  paddingRight: '42px',
                  border: '1px solid rgba(200, 200, 200, 0.6)',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
                required 
              />
              <button 
                type="button" 
                className="toggle-pwd-btn" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={{
                width: '100%',
                padding: '0.8rem 0',
                background: '#4f46e5',
                color: '#ffffff',
                borderRadius: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                marginTop: '5px'
              }}
            >
              {loading ? "LOGGING IN..." : "LOGIN"}
            </button>
          </form>

          <div style={{ marginTop: '16px', display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Forgot Password?
            </button>
            <button 
              type="button"
              onClick={() => navigate('/admin-login')}
              style={{ background: 'none', border: 'none', color: '#1e293b', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              🛡️ Admin Login
            </button>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        textAlign: 'center',
        padding: '0.75rem 0',
        fontSize: '0.82rem',
        color: '#cbd5e1'
      }}>
        Copyrights &copy; 2026, SmartAttend System. All rights reserved.
      </footer>

      {/* FORGOT PASSWORD MODAL */}
      {isForgotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>🔑 Reset Password (2-Step Verification)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter your Faculty ID to request a WhatsApp OTP verification code.
            </p>

            <div className="input-group">
              <label>Faculty ID</label>
              <input 
                type="text" 
                placeholder="e.g. FAC101" 
                value={resetTeacherId} 
                onChange={(e) => setResetTeacherId(e.target.value)} 
              />
            </div>

            {otpStep === 1 && (
              <button onClick={handleRequestOtp} className="btn btn-secondary" style={{ width: '100%', marginBottom: '15px' }}>
                💬 Request WhatsApp OTP
              </button>
            )}

            {otpStep === 2 && (
              <>
                {whatsappUrl && (
                  <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                    <a 
                      href={whatsappUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary" 
                      style={{ width: '100%', borderColor: '#25D366', color: '#25D366', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      📲 Open WhatsApp to Receive OTP
                    </a>
                  </div>
                )}

                <div className="input-group">
                  <label>6-Digit OTP Code</label>
                  <input 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    maxLength="6"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter new password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="modal-actions">
              <button onClick={() => setIsForgotModalOpen(false)} className="btn btn-secondary">Cancel</button>
              {otpStep === 2 && (
                <button onClick={handleVerifyOtpAndReset} className="btn btn-primary">Reset Password</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}