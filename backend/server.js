require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Import Mongoose Models
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Admin = require('./models/Admin');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serving frontend build files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Twilio Setup
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;

let twilioClient = null;
if (TWILIO_SID && TWILIO_SID.startsWith('AC') && TWILIO_AUTH) {
  const twilio = require('twilio');
  twilioClient = twilio(TWILIO_SID, TWILIO_AUTH);
  console.log('✅ Twilio WhatsApp client initialized.');
} else {
  console.log('⚠️ Twilio credentials not set or invalid — WhatsApp messages will be SIMULATED.');
}

// MONGODB ATLAS CONNECTION
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smartattend";

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("⚡ Connected to MongoDB Atlas successfully!");

    // 1. Seed Default Admin if Missing
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        admin_id: 'admin',
        full_name: 'System Administrator',
        email: 'admin@college.edu',
        password_hash: 'admin123'
      });
      console.log("✅ Default admin created (User: admin / Pass: admin123)");
    }

    // 2. Seed Default Faculty if Missing
    const teacherCount = await Teacher.countDocuments();
    if (teacherCount === 0) {
      await Teacher.create({
        teacher_id: 'FAC101',
        full_name: 'Dr. Smith',
        email: 'fac101@college.edu',
        phone: '9876543210',
        password_hash: 'admin123',
        dept_code: 'MCA'
      });
      console.log("✅ Default faculty created (User: FAC101 / Pass: admin123)");
    }
  })
  .catch(err => console.error("❌ Connection Error:", err.message));

// HAVERSINE FORMULA (GPS Distance Calculation)
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== ADMIN AUTHENTICATION ====================

app.post('/api/admin/login', async (req, res) => {
  const { adminId, password } = req.body;

  try {
    const admin = await Admin.findOne({ admin_id: adminId.trim(), password_hash: password.trim() });
    if (admin) {
      res.json({ success: true, admin });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Admin Credentials!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== FACULTY & USER ROUTES ====================

app.post('/api/login', async (req, res) => {
  const { teacherId, password } = req.body;

  try {
    const teacher = await Teacher.findOne({ teacher_id: teacherId.trim(), password_hash: password.trim() });
    if (teacher) {
      res.json({ success: true, teacher });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Faculty ID or Password!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// FACULTY CHANGE PASSWORD ENDPOINT
app.post('/api/change-password', async (req, res) => {
  const { teacherId, currentPassword, newPassword } = req.body;

  try {
    const teacher = await Teacher.findOne({ teacher_id: teacherId });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher account not found.' });
    }

    if (teacher.password_hash !== currentPassword.trim()) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect!' });
    }

    teacher.password_hash = newPassword.trim();
    await teacher.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== STUDENT REGISTRATION & STATS ====================

// 1. STRICT STUDENT VERIFICATION
app.get('/api/student/verify', async (req, res) => {
  try {
    const { roll_no } = req.query;
    if (!roll_no) {
      return res.status(400).json({ success: false, message: 'Roll number is required' });
    }

    const cleanRollNo = roll_no.trim().toUpperCase();

    const student = await Student.findOne({ 
      roll_no: { $regex: new RegExp(`^${cleanRollNo}$`, 'i') } 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Roll Number not registered in system! Please ask faculty to add your details.' 
      });
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CALCULATE WEEKLY AND MONTHLY ATTENDANCE STATS
app.get('/api/student/stats', async (req, res) => {
  try {
    const { roll_no } = req.query;
    
    const now = new Date();
    
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date();
    monthAgo.setDate(now.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const allRecords = await Attendance.find({ roll_no });

    const weeklyRecords = allRecords.filter(r => r.date >= weekAgoStr);
    const weeklyTotal = weeklyRecords.length;
    const weeklyPresent = weeklyRecords.filter(r => r.status === 'Present').length;
    const weeklyPercentage = weeklyTotal > 0 ? Math.round((weeklyPresent / weeklyTotal) * 100) : 0;

    const monthlyRecords = allRecords.filter(r => r.date >= monthAgoStr);
    const monthlyTotal = monthlyRecords.length;
    const monthlyPresent = monthlyRecords.filter(r => r.status === 'Present').length;
    const monthlyPercentage = monthlyTotal > 0 ? Math.round((monthlyPresent / monthlyTotal) * 100) : 0;

    res.json({
      weeklyTotal,
      weeklyPresent,
      weeklyPercentage,
      monthlyTotal,
      monthlyPresent,
      monthlyPercentage
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. DETAILED ADVANCED STUDENT ATTENDANCE STATS (WORKING DAYS, SUBJECTS & BAR GRAPH)
app.get('/api/student/detailed-stats', async (req, res) => {
  try {
    const { roll_no } = req.query;
    if (!roll_no) return res.status(400).json({ success: false, message: 'Roll number required' });

    const cleanRoll = roll_no.trim().toUpperCase();
    const records = await Attendance.find({ roll_no: cleanRoll });

    const totalPresent = records.filter(r => r.status === 'Present').length;
    const totalAbsent = records.filter(r => r.status === 'Absent').length;
    const totalWorkingDays = new Set(records.map(r => r.date)).size;

    // Subject Breakdown
    const subjectMap = {};
    records.forEach(r => {
      const subj = r.hour || 'General Class';
      if (!subjectMap[subj]) {
        subjectMap[subj] = { present: 0, absent: 0, totalPeriods: 0 };
      }
      subjectMap[subj].totalPeriods += 1;
      if (r.status === 'Present') subjectMap[subj].present += 1;
      else subjectMap[subj].absent += 1;
    });

    // Monthly Bar Graph Data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyBarDataMap = {};

    records.forEach(r => {
      const dateObj = new Date(r.date);
      const mKey = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      
      if (!monthlyBarDataMap[mKey]) {
        monthlyBarDataMap[mKey] = { monthLabel: mKey, presentDaysCount: 0, totalDaysCount: 0, presentDates: new Set() };
      }
      if (r.status === 'Present') {
        monthlyBarDataMap[mKey].presentDates.add(r.date);
      }
    });

    const monthlyBarGraph = Object.values(monthlyBarDataMap).map(m => ({
      monthLabel: m.monthLabel,
      presentDaysCount: m.presentDates.size
    }));

    res.json({
      success: true,
      totalWorkingDays,
      totalPresent,
      totalAbsent,
      subjects: subjectMap,
      monthlyBarGraph
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET STUDENTS FILTERED BY DEPT, YEAR, SECTION
app.get('/api/students', async (req, res) => {
  try {
    const { dept, year, section } = req.query;
    
    let query = {};
    if (dept) query.dept_code = new RegExp(`^${dept}$`, 'i');
    if (year) query.year_level = new RegExp(`^${year}$`, 'i');
    if (section) query.section = new RegExp(`^${section}$`, 'i');

    const students = await Student.find(query);
    res.json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ success: false, message: "Error fetching students" });
  }
});

// GET SAVED ATTENDANCE RECORDS
app.get('/api/attendance/records', async (req, res) => {
  try {
    const { dept, hour, date } = req.query;
    const records = await Attendance.find({ dept_code: dept, hour, date });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Error fetching saved attendance" });
  }
});


// GET REAL-TIME ATTENDANCE STATUS ISOLATED PER FACULTY
app.get('/api/attendance/live', async (req, res) => {
  const { dept, hour, date, teacherId } = req.query;

  try {
    if (!dept || !date) {
      return res.json([]);
    }

    const hourPrefix = hour ? hour.split(' ')[0] + ' ' + (hour.split(' ')[1] || '') : '';

    const query = {
      dept_code: new RegExp(`^${dept.trim()}$`, 'i'),
      date: date.trim(),
      status: 'Present'
    };

    if (hourPrefix.trim()) {
      query.hour = { $regex: new RegExp(hourPrefix.trim(), 'i') };
    }

    // STRICT MULTI-TEACHER ISOLATION: Scopes live updates strictly to the logged-in teacher
    if (teacherId) {
      query.teacher_id = teacherId.trim();
    }

    const results = await Attendance.find(query, 'roll_no status');
    res.json(results);
  } catch (err) {
    console.error("Error fetching live attendance:", err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// SAVE / SUBMIT ATTENDANCE
app.post('/api/attendance/submit', async (req, res) => {
  const { date, hour, teacherId, dept, records } = req.body;

  if (!records || records.length === 0) {
    return res.status(400).json({ success: false, message: "No attendance records provided." });
  }

  try {
    for (const item of records) {
      await Attendance.findOneAndUpdate(
        { date, hour, dept_code: dept, roll_no: item.roll_no },
        { 
          status: item.status, 
          sms_status: item.sms_status || "Not Sent", 
          teacher_id: teacherId,
          updated_at: new Date()
        },
        { returnDocument: 'after', upsert: true }
      );
    }
    res.json({ success: true, message: "Attendance saved permanently!" });
  } catch (err) {
    console.error("Database save error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// MULTI-SESSION QR CODE GENERATOR
let activeQrSessions = {};

app.post('/api/qr/generate-location', (req, res) => {
  const { dept, year, section, hour, date, teacherLat, teacherLng, teacherId } = req.body;
  
  const cleanHour = hour.split(' ')[0];
  const sessionId = `${dept}_${year.replace(/\s+/g, '')}_${section.replace(/\s+/g, '')}_${cleanHour}_${date}`;

  activeQrSessions[sessionId] = {
    dept, year, section, hour, date,
    teacherId: teacherId || 'FAC101',
    lat: parseFloat(teacherLat),
    lng: parseFloat(teacherLng),
    expiresAt: Date.now() + (10 * 60 * 1000)
  };

  res.json({ 
    success: true, 
    sessionId: sessionId,
    qrPayload: JSON.stringify({ sessionId, dept, section, hour, date, time: Date.now() })
  });
});

// STUDENT QR ATTENDANCE VERIFICATION
app.post('/api/qr/verify-student', async (req, res) => {
  const { rollNo, studentLat, studentLng, sessionId } = req.body;

  const session = activeQrSessions[sessionId];

  if (!session || !session.expiresAt) {
    return res.status(400).json({ success: false, message: "No active QR session found for this class!" });
  }

  if (Date.now() > session.expiresAt) {
    return res.status(400).json({ success: false, message: "QR Code has expired!" });
  }

  const distance = getDistanceInMeters(
    session.lat,
    session.lng,
    parseFloat(studentLat),
    parseFloat(studentLng)
  );

  if (distance > 500) {
    return res.status(403).json({ 
      success: false, 
      message: `Location verification failed! You are ${Math.round(distance)}m away from classroom.` 
    });
  }

  try {
    const student = await Student.findOne({ roll_no: rollNo.toUpperCase() });
    
    if (!student) {
      return res.status(400).json({ 
        success: false, 
        message: `Roll No ${rollNo} is not registered in system! Contact faculty.` 
      });
    }

    await Attendance.findOneAndUpdate(
      { roll_no: rollNo.toUpperCase(), dept_code: session.dept, hour: session.hour, date: session.date },
      { status: 'Present', teacher_id: session.teacherId },
      { returnDocument: 'after', upsert: true }
    );

    res.json({ 
      success: true, 
      message: `✅ Attendance marked Present for ${student.full_name} (${rollNo})!` 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Database error recording attendance." });
  }
});

// ==================== ADMIN API ENDPOINTS ====================

app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();

    const today = new Date().toISOString().split('T')[0];
    const todayPresent = await Attendance.countDocuments({ status: 'Present', date: today });
    const todayAbsent = await Attendance.countDocuments({ status: 'Absent', date: today });

    res.json({
      totalStudents,
      totalTeachers,
      todayPresent,
      todayAbsent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/teachers', async (req, res) => {
  const { teacher_id, full_name, email, phone, dept_code, branch, password_hash } = req.body;
  
  try {
    await Teacher.create({
      teacher_id: teacher_id.trim(),
      full_name: full_name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      dept_code: branch || dept_code || 'CSE',
      password_hash: password_hash ? password_hash.trim() : 'admin123'
    });
    res.json({ success: true, message: "Faculty added successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/teachers/update', async (req, res) => {
  const { teacher_id, full_name, email, phone, dept_code } = req.body;
  try {
    await Teacher.updateOne(
      { teacher_id: teacher_id.trim() },
      { full_name, email, phone, dept_code }
    );
    res.json({ success: true, message: "Faculty updated successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/teachers/delete', async (req, res) => {
  const { teacher_id } = req.query;
  try {
    await Teacher.deleteOne({ teacher_id: teacher_id.trim() });
    res.json({ success: true, message: "Faculty deleted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/students', async (req, res) => {
  const { roll_no, full_name, parent_phone, dept_code, year_level, section } = req.body;

  try {
    await Student.create({
      roll_no: roll_no.trim(),
      full_name: full_name.trim(),
      parent_phone: parent_phone ? parent_phone.trim() : '0000000000',
      dept_code: dept_code ? dept_code.trim() : 'CSE',
      year_level: year_level ? year_level.trim() : '1st Year',
      section: section ? section.trim() : 'Sec A'
    });
    res.json({ success: true, message: "Student added successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/students/update', async (req, res) => {
  const { roll_no, full_name, parent_phone, dept_code, year_level, section } = req.body;
  try {
    await Student.updateOne(
      { roll_no: roll_no.trim() },
      { full_name, parent_phone, dept_code, year_level, section }
    );
    res.json({ success: true, message: "Student updated successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/admin/teachers-list', async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/students-list', async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/delete', async (req, res) => {
  const { roll_no, dept_code } = req.query;

  try {
    const result = await Student.deleteOne({ roll_no, dept_code });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    res.json({ success: true, message: "Student deleted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 2SV / OTP FORGOT PASSWORD ====================

let otpStore = {};

app.post('/api/request-reset-otp', async (req, res) => {
  const { teacherId } = req.body;

  try {
    const teacher = await Teacher.findOne({ teacher_id: teacherId.trim() });
    
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Faculty ID not found.' });
    }

    if (!teacher.phone) {
      return res.status(400).json({ success: false, message: 'No registered phone number found for this Faculty ID.' });
    }

    let cleanPhone = teacher.phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[teacher.teacher_id] = {
      otp: generatedOtp,
      expiresAt: Date.now() + (5 * 60 * 1000)
    };

    const messageText = `🔒 SmartAttend Verification Code: Your OTP for resetting password is ${generatedOtp}. Valid for 5 minutes.`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;

    res.json({ 
      success: true, 
      message: `OTP generated for ${teacher.full_name}! Send it via WhatsApp to receive your code.`,
      whatsappUrl: whatsappUrl
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process OTP request.' });
  }
});

app.post('/api/verify-otp-reset-password', async (req, res) => {
  const { teacherId, otp, newPassword } = req.body;

  const record = otpStore[teacherId.trim()];

  if (!record || Date.now() > record.expiresAt) {
    delete otpStore[teacherId.trim()];
    return res.status(400).json({ success: false, message: 'OTP expired or not requested. Try again.' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code!' });
  }

  try {
    await Teacher.updateOne({ teacher_id: teacherId.trim() }, { password_hash: newPassword.trim() });
    delete otpStore[teacherId.trim()];
    res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error updating password.' });
  }
});

// CATCH-ALL ROUTE (Must stay right above app.listen)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Attendance Backend Server running on port ${PORT}`);
});