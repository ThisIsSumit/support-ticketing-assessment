const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['agent', 'supervisor'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);