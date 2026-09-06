const mongoose = require('mongoose');

const EventRegistrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventTitle: { type: String, required: true },
  studentName: { type: String, required: true },
  rollNo: { type: String, required: true },
  dept: { type: String, required: true },
  year: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  teamName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('EventRegistration', EventRegistrationSchema);