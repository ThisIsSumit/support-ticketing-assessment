const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  requesterEmail: { type: String, required: true, lowercase: true, trim: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], required: true },
//   category: { type: String, required: true, trim: true },
category: { type: String, enum: ['bug', 'billing', 'how_to', 'feature_request', 'other'], required: true },
// ...
  status: {
    type: String,
    enum: ['New', 'Open', 'Pending', 'Resolved', 'Closed'],
    default: 'New',
  },
  primaryAssigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',default: null },
  collaboratorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reopenedAt: { type: Date, default: null },

  firstResponseTargetMinutes: { type: Number, required: true },
  pendingSince: { type: Date, default: null },
  totalPausedMs: { type: Number, default: 0 },
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },
}, { timestamps: true });

ticketSchema.index({ subject: 'text', description: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);