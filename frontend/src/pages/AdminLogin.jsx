import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function AdminLogin() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.remove("dark-mode");
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminId.trim() || !password.trim()) {
      alert("Please enter both Admin ID and Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/login', { 
        adminId: adminId.trim(), 
        password: password.trim() 
      });

      if (res.data && res.data.success) {
        sessionStorage.setItem("isAdminLoggedIn", "true");
        sessionStorage.setItem("activeAdmin", JSON.stringify(res.data.admin));
        navigate('/admin');
      } else {
        alert("❌ " + (res.data?.message || "Invalid Admin Credentials"));
      }
    } catch (err) {
      alert("❌ Invalid Admin Credentials or Server Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 20% 20%, rgba(225, 226, 255, 0.25), transparent 40%), linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 27, 75, 0.9)), url("/bvraju.jpg") center / cover no-repeat',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        padding: '38px 32px',
        background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🛡️</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
          Admin Portal
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '28px' }}>
          Enter administrative credentials to continue
        </p>

        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Admin ID / Email
            </label>
            <input 
              type="text" 
              placeholder="e.g. admin" 
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                background: 'rgba(15, 23, 42, 0.6)', 
                color: '#ffffff', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                outline: 'none'
              }}
              required 
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div className="pwd-wrapper" style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  paddingRight: '42px',
                  background: 'rgba(15, 23, 42, 0.6)', 
                  color: '#ffffff', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '14px',
              marginTop: '10px',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)'
            }}
          >
            {loading ? "Authenticating..." : "Login to Dashboard"}
          </button>
        </form>

        <button 
          onClick={() => navigate('/')} 
          style={{ 
            marginTop: '20px', 
            width: '100%', 
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.08)', 
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ⬅ Back to Main Portal
        </button>
      </div>
    </div>
  );
}