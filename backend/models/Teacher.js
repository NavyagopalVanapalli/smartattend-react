const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  teacher_id: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: null },
  dept_code: { type: String, default: 'MCA' },
  password_hash: { type: String, default: 'admin123' },
  // Extended Faculty Attributes
  previous_colleges: { type: [String], default: [] },
  total_experience: { type: String, default: '5 Years' },
  known_subjects: { type: [String], default: [] },
  current_teaching_subjects: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);