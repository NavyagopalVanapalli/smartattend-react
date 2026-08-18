import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import Student from './pages/Student';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("appTheme") === "dark");

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("appTheme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("appTheme", "light");
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/dashboard" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/admin" element={<AdminDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/student" element={<Student darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}