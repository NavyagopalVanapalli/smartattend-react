const mongoose = require('mongoose');

const LeaveRequestSchema = new mongoose.Schema({
  roll_no: { type: String, required: true },
  student_name: { type: String, required: true },
  dept_code: { type: String, required: true },
  leave_type: { type: String, enum: ['OD', 'Medical', 'Personal'], required: true },
  from_date: { type: String, required: true },
  to_date: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  reviewed_by: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', LeaveRequestSchema);