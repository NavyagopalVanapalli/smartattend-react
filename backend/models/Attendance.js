const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  roll_no: { type: String, required: true },
  dept_code: { type: String, required: true },
  hour: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  teacher_id: { type: String, required: true }
}, { timestamps: true });

attendanceSchema.index({ roll_no: 1, dept_code: 1, hour: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);