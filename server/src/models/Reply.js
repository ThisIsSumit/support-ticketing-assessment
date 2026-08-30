const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  authorType: { type: String, enum: ['agent', 'customer'], default: 'agent' },
  isInternal: { type: Boolean, default: false },
}, { timestamps: true });

replySchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model('Reply', replySchema);
