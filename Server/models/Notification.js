// models/Notification.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['event', 'comment', 'file'], required: true },
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  time: { type: Date, default: Date.now },
  readBy: [{ type: String }]
}, { timestamps: true });

// Optional TTL: delete notifications after 30 days
NotificationSchema.index({ time: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30 days

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
