const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacher_id: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password_hash: { type: String, required: true },
  dept_code: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);