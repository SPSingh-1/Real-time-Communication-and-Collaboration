// models/Notification.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['event', 'comment', 'file', 'task', 'attendee'], required: true },
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  time: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  globalId: { type: String, default: null }, // For global scope notifications
  scope: { type: String, enum: ['single', 'team', 'global'], default: 'single' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Index for better performance
NotificationSchema.index({ user: 1, time: -1 });
NotificationSchema.index({ teamId: 1, time: -1 });
NotificationSchema.index({ scope: 1, time: -1 });
NotificationSchema.index({ globalId: 1, time: -1 });

// TTL: delete notifications after 30 days
NotificationSchema.index({ time: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // 30 days

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;