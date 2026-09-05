const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  dept: { type: String, required: true },
  year: { type: String, required: true },
  docType: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  size: { type: String, default: 'PDF Document' },
  uploadedBy: { type: String, default: 'Faculty' }
}, { timestamps: true });

module.exports = mongoose.model('Resource', ResourceSchema);