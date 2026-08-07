const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  roll_no: { type: String, required: true },
  full_name: { type: String, required: true },
  parent_phone: { type: String, required: true },
  dept_code: { type: String, required: true },
  year_level: { type: String, required: true },
  section: { type: String, required: true }
}, { timestamps: true });

studentSchema.index({ roll_no: 1, dept_code: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);