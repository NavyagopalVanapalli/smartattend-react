
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import StudentAttendance from './pages/StudentAttendance';
import AcademicHub from './pages/AcademicHub';
import HubLogin from './pages/HubLogin';
import TeacherDashboard from './pages/TeacherDashboard';

function ManifestController() {
  const location = useLocation();

  useEffect(() => {
    let manifestUrl = '/manifest.json';
    let pageTitle = 'SmartAttend';

    if (location.pathname.startsWith('/student')) {
      manifestUrl = '/manifest-student.json';
      pageTitle = 'Student Attendance | SmartAttend';
    } else if (location.pathname.startsWith('/teacher') || location.pathname.startsWith('/dashboard')) {
      manifestUrl = '/manifest-teacher.json';
      pageTitle = 'Teacher Attendance | SmartAttend';
    } else if (location.pathname.startsWith('/faculty-portal')) {
      manifestUrl = '/manifest-faculty.json';
      pageTitle = 'Faculty Portal | SmartAttend';
    } else if (location.pathname.startsWith('/admin')) {
      pageTitle = 'Admin Portal | SmartAttend';
    }

    document.title = pageTitle;

    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute('href', manifestUrl);
  }, [location.pathname]);

  return null;
}

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
      <ManifestController />
      <Routes>
        {/* Default Landing */}
        <Route path="/" element={<Login darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Student Shortcut Target */}
        <Route path="/student" element={<StudentAttendance darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Teacher Shortcut Targets */}
        <Route path="/teacher" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/dashboard" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/faculty-portal" element={<TeacherDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />

        {/* Admin & Hub */}
        <Route path="/admin" element={<AdminDashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/hub" element={<AcademicHub />} />
        <Route path="/hub-login" element={<HubLogin />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}