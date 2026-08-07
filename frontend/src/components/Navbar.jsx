import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ activeTeacher, darkMode, setDarkMode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("activeTeacher");
    sessionStorage.removeItem("college_attendance_filters");
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="logo">
        <img src="/Srivishnu_Logo.jpg" alt="Logo" className="nav-logo-img" />
        <span>SmartAttend</span>
      </div>

      <div className="nav-actions">
        <button onClick={() => navigate('/admin')} className="btn btn-secondary">
          🛡️ Admin Panel
        </button>

        <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary">
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>

        {activeTeacher && (
          <button onClick={handleLogout} className="btn btn-danger">
            Logout
          </button>
        )}
      </div>
    </header>
  );
}