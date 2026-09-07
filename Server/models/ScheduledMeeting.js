import mongoose from 'mongoose';

const scheduledMeetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  roomId: { type: String, required: true, trim: true },
  callType: { type: String, enum: ['video', 'audio'], default: 'video' },
  scheduledTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 30 },
  hostUser: {
    id: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    email: { type: String },
    photo: { type: String }
  },
  targetType: { type: String, enum: ['all', 'specific'], default: 'all' },
  targetUserIds: [{ type: mongoose.Schema.Types.Mixed }],
  teamId: { type: mongoose.Schema.Types.Mixed, default: null },
  scope: { type: String, default: 'team' },
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  triggered: { type: Boolean, default: false },
  triggeredAt: { type: Date },
  attendees: [
    {
      userId: { type: mongoose.Schema.Types.Mixed },
      name: { type: String, default: 'Attendee' },
      email: { type: String, default: '' },
      photo: { type: String, default: '' },
      role: { type: String, default: 'member' },
      joinedAt: { type: Date, default: Date.now },
      leftAt: { type: Date },
      durationSeconds: { type: Number, default: 0 }
    }
  ],
  chatMessages: [
    {
      id: { type: String },
      senderId: { type: mongoose.Schema.Types.Mixed },
      senderName: { type: String, default: 'User' },
      senderPhoto: { type: String, default: '' },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  recordings: [
    {
      id: { type: String },
      title: { type: String, default: 'Meeting Recording' },
      url: { type: String, required: true },
      durationSeconds: { type: Number, default: 0 },
      recordedBy: { type: String, default: 'Host' },
      recordedAt: { type: Date, default: Date.now },
      size: { type: Number, default: 0 }
    }
  ]
}, { timestamps: true });

// Index for efficient querying by team/time
scheduledMeetingSchema.index({ scheduledTime: 1, status: 1, triggered: 1 });
scheduledMeetingSchema.index({ teamId: 1, status: 1 });
scheduledMeetingSchema.index({ roomId: 1 });

const ScheduledMeeting = mongoose.model('ScheduledMeeting', scheduledMeetingSchema);
export default ScheduledMeeting;
