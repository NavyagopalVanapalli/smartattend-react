import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import StudentAttendance from './pages/StudentAttendance';
import AcademicHub from './pages/AcademicHub';
import HubLogin from './pages/HubLogin';
import TeacherDashboard from './pages/TeacherDashboard';

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
        {/* Student Portal Entry */}
        <Route path="/student" element={<StudentAttendance darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Teacher / Attendance Dashboard Entries */}
        <Route path="/teacher" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/dashboard" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/faculty-portal" element={<TeacherDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Admin Portal Entries */}
        <Route path="/admin" element={<AdminDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Academic Hub */}
        <Route path="/hub" element={<AcademicHub />} />
        <Route path="/hub-login" element={<HubLogin />} />

        {/* Default Landing */}
        <Route path="/" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}