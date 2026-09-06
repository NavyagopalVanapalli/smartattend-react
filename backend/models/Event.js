const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'Placement Drive', 'Project Expo', 'Hackathon', 'College Festival'
  title: { type: String, required: true },
  date: { type: String, required: true },
  venue: { type: String, required: true },
  eligible: { type: String, required: true },
  badgeColor: { type: String, default: '#6366f1' },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);