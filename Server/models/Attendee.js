// models/Attendee.js
import mongoose from 'mongoose';

const attendeeSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  status: {
    type: String,
    enum: ['going', 'maybe', 'declined', 'busy'],
    default: 'going'
  },
  reason: {
    type: String,
  }
}, { timestamps: true });

export default mongoose.model('Attendee', attendeeSchema);
