import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Student from './pages/Student';
import './style.css';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  return (
    <Router>
      <Routes>
        {/* Faculty Login */}
        <Route path="/" element={<Login />} />
        
        {/* Faculty Dashboard */}
        <Route path="/dashboard" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        
        {/* Admin Login */}
        <Route path="/admin-login" element={<AdminLogin />} />
        
        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        
        {/* Student Portal */}
        <Route path="/student" element={<Student darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}