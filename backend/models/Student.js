const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  roll_no: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  parent_phone: { type: String, default: '0000000000' },
  dept_code: { type: String, default: 'MCA' },
  year_level: { type: String, default: '1st Year' },
  section: { type: String, default: 'Sec A' },
  // Extended Profile Attributes
  academic_period: { type: String, default: '2024 - 2026' },
  projects: { type: [String], default: [] },
  programming_languages: { type: [String], default: [] },
  certificates: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);