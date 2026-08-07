const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  admin_id: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);