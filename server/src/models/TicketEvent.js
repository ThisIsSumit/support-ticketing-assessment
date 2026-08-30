const mongoose = require('mongoose');

const ticketEventSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  type: { type: String, enum: ['created', 'status_change', 'reassignment', 'reply'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromValue: { type: String, default: null },
  toValue: { type: String, default: null },
}, { timestamps: true });

ticketEventSchema.index({ ticketId: 1, createdAt: 1 });

// No update/delete routes will ever be built against this model — that's what
// makes it append-only in practice. (Mongo has no built-in immutability
// enforcement short of a capped collection, which doesn't fit here.)
module.exports = mongoose.model('TicketEvent', ticketEventSchema);